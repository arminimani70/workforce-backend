// Shared by Availability (which positions an employee can work), Scheduling (which position a
// shift is for), and Tasks (position-based assignment). MANAGER lets an owner/manager tag a
// day/shift as themselves being the on-duty manager, through the same mechanism as every other
// position — no separate concept needed.
export enum Position {
  FRONTDESK = 'frontdesk',
  HELPDESK = 'helpdesk',
  INFORMATION = 'information',
  CONSULTATION = 'consultation',
  MANAGER = 'manager',
}
