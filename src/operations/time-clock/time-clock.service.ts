import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter } from 'mongoose';
import {
  TimeClockEntry,
  TimeClockEntryDocument,
} from './schemas/time-clock-entry.schema';
import { ClockLocationDto } from './dto/clock-location.dto';
import { ClockInDto } from './dto/clock-in.dto';
import { SchedulingService } from '../scheduling/scheduling.service';
import { BranchesService } from '../branches/branches.service';
import { distanceMeters } from '../../common/utils/geo.util';

function toGeoPoint(dto: ClockLocationDto) {
  return dto.lat !== undefined && dto.lng !== undefined
    ? { lat: dto.lat, lng: dto.lng }
    : undefined;
}

function dayBounds(iso: string | undefined, fallback: () => Date) {
  return iso ? new Date(iso) : fallback();
}

@Injectable()
export class TimeClockService {
  constructor(
    @InjectModel(TimeClockEntry.name)
    private readonly entryModel: Model<TimeClockEntryDocument>,
    private readonly schedulingService: SchedulingService,
    private readonly branchesService: BranchesService,
  ) {}

  private findOpenEntry(organizationId: string, employeeId: string) {
    return this.entryModel.findOne({
      organizationId,
      employeeId,
      clockOutTime: { $exists: false },
    });
  }

  async clockIn(organizationId: string, employeeId: string, dto: ClockInDto) {
    const openEntry = await this.findOpenEntry(organizationId, employeeId);
    if (openEntry) {
      throw new ConflictException('Already clocked in');
    }

    const reason = dto.reason?.trim();
    const jobSite = dto.jobSite?.trim();
    // Which branch to geofence-check against — the no-shift path uses the branch picked in the
    // popup; the normal path infers it from whichever of today's shifts is relevant (same
    // "current, else next" rule useTodayShiftContext uses on the app, so the two never disagree
    // about which shift's branch applies).
    let geofenceJobSite = jobSite;

    if (!reason) {
      const dayStart = dayBounds(dto.dayStart, () => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
      });
      const dayEnd = dayBounds(dto.dayEnd, () => {
        const d = new Date();
        d.setHours(23, 59, 59, 999);
        return d;
      });
      const todaysShifts = await this.schedulingService.findForEmployee(
        organizationId,
        employeeId,
        { from: dayStart, to: dayEnd, approvedOnly: true },
      );
      if (todaysShifts.length === 0) {
        throw new BadRequestException(
          'No shift scheduled today — use Extra Shift Clock In if you need to start work without one',
        );
      }

      // Only shifts with a branch attached are candidates for "the relevant shift" here — a
      // shift scheduled without one (jobSite left blank) has nothing to geofence-check
      // against. Mirrors useTodayShiftContext on the app exactly (same filter-then-pick-
      // current-else-next order), so the two never disagree about which shift's branch is
      // the one currently in effect — if they picked different shifts, the warning shown on
      // screen and the branch actually enforced here could silently point at two different
      // branches.
      const now = Date.now();
      const withBranch = todaysShifts.filter((s) => s.jobSite);
      const current = withBranch.find(
        (s) =>
          new Date(s.startTime).getTime() <= now &&
          now <= new Date(s.endTime).getTime(),
      );
      const next = withBranch
        .filter((s) => new Date(s.startTime).getTime() > now)
        .sort(
          (a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
        )[0];
      geofenceJobSite = (current ?? next)?.jobSite;
    } else {
      // A no-shift clock-in has nothing to infer the branch/position from, so both are
      // required alongside the reason.
      if (!jobSite) {
        throw new BadRequestException('Select a branch for this clock-in');
      }
      if (!dto.position) {
        throw new BadRequestException('Select a position for this clock-in');
      }
    }

    if (geofenceJobSite) {
      const branch = await this.branchesService.findByName(
        organizationId,
        geofenceJobSite,
      );
      if (branch) {
        const location = toGeoPoint(dto);
        if (!location) {
          throw new BadRequestException(
            `Location is required to clock in at ${branch.name} — enable location and try again`,
          );
        }
        const distance = distanceMeters(location, {
          lat: branch.lat,
          lng: branch.lng,
        });
        if (distance > branch.radiusMeters) {
          throw new BadRequestException(
            `You're too far from ${branch.name} to clock in — must be within ${branch.radiusMeters}m`,
          );
        }
      }
    }

    return this.entryModel.create({
      organizationId,
      employeeId,
      clockInTime: new Date(),
      clockInLocation: toGeoPoint(dto),
      reason,
      jobSite,
      position: dto.position,
    });
  }

  async clockOut(
    organizationId: string,
    employeeId: string,
    location: ClockLocationDto,
  ) {
    const openEntry = await this.findOpenEntry(organizationId, employeeId);
    if (!openEntry) {
      throw new NotFoundException('Not currently clocked in');
    }

    openEntry.clockOutTime = new Date();
    const geoPoint = toGeoPoint(location);
    if (geoPoint) {
      openEntry.clockOutLocation = geoPoint;
    }
    return openEntry.save();
  }

  getStatus(organizationId: string, employeeId: string) {
    return this.findOpenEntry(organizationId, employeeId);
  }

  getHistory(organizationId: string, employeeId: string, limit = 20) {
    return this.entryModel
      .find({ organizationId, employeeId })
      .sort({ clockInTime: -1 })
      .limit(limit);
  }

  // Owner/manager only — every employee's clock entries in range, for the admin panel's
  // attendance report. Unlike getHistory (one employee, most-recent-first, capped), this has
  // no employee filter and no cap; from/to bound it instead.
  findAllInOrg(organizationId: string, from?: Date, to?: Date) {
    const filter: QueryFilter<TimeClockEntryDocument> = { organizationId };
    if (from || to) {
      filter.clockInTime = {
        ...(from && { $gte: from }),
        ...(to && { $lte: to }),
      };
    }
    return this.entryModel
      .find(filter)
      .populate('employeeId', 'fullName role')
      .sort({ clockInTime: -1 });
  }

  // Sums (clockOutTime ?? now) - clockInTime for every entry that *started* in [from, to],
  // so a currently open entry counts toward the total up to this instant.
  async getTotalDuration(
    organizationId: string,
    employeeId: string,
    from?: Date,
    to?: Date,
  ) {
    const filter: QueryFilter<TimeClockEntryDocument> = {
      organizationId,
      employeeId,
    };
    if (from || to) {
      filter.clockInTime = {
        ...(from && { $gte: from }),
        ...(to && { $lte: to }),
      };
    }

    const entries = await this.entryModel.find(filter);
    const now = new Date();
    const totalMs = entries.reduce((sum, entry) => {
      const end = entry.clockOutTime ?? now;
      return sum + (end.getTime() - entry.clockInTime.getTime());
    }, 0);

    return { totalSeconds: Math.round(totalMs / 1000) };
  }
}
