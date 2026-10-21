namespace itam;

using { cuid, managed } from '@sap/cds/common';

entity Departments : cuid, managed {
  name        : String(100) not null;
  costCenter  : String(40);
  headPerson  : String(120);
  isActive    : Boolean default true;
  employees   : Association to many Employees on employees.department = $self;
}

entity Employees : cuid, managed {
  employeeNumber : String(40);
  fullName       : String(120) not null;
  email          : String(255);
  phone          : String(40);
  location       : String(120);
  status         : String(20) default 'ACTIVE';
  department     : Association to Departments;
  assignments    : Association to many AssetAssignments on assignments.employee = $self;
}

entity AssetCategories : cuid, managed {
  name           : String(100) not null;
  lifespanMonths : Integer;
  isActive       : Boolean default true;
  assets         : Association to many Assets on assets.category = $self;
}

entity Vendors : cuid, managed {
  name         : String(160) not null;
  email        : String(255);
  phone        : String(40);
  supportInfo  : String(500);
  isActive     : Boolean default true;
  assets       : Association to many Assets on assets.vendor = $self;
}

entity Assets : cuid, managed {
  assetTag             : String(50) not null;
  serialNumber         : String(100) not null;
  model                : String(120);
  description          : String(500);
  category             : Association to AssetCategories not null;
  vendor               : Association to Vendors;
  purchaseDate         : Date not null;
  purchaseCost         : Decimal(13,2);
  warrantyExpiry       : Date;
  firstDistributionDate: Date;
  status               : String(24) default 'AVAILABLE';
  currentHolder        : Association to Employees;
  assignments          : Association to many AssetAssignments on assignments.asset = $self;
  maintenanceRecords   : Association to many MaintenanceRecords on maintenanceRecords.asset = $self;
  maintenanceRequests  : Association to many MaintenanceRequests on maintenanceRequests.asset = $self;
  ownershipLedger      : Association to many OwnershipLedgers on ownershipLedger.asset = $self;
  archiveRecords       : Association to many ArchiveRecords on archiveRecords.asset = $self;
}

entity AssetAssignments : cuid, managed {
  asset              : Association to Assets not null;
  employee           : Association to Employees not null;
  assignedDate       : Date not null;
  expectedReturnDate : Date;
  actualReturnDate   : Date;
  assignmentStatus   : String(20) default 'ACTIVE';
}

entity OwnershipLedgers : cuid, managed {
  asset            : Association to Assets not null;
  action            : String(40) not null;
  fromEmployee      : Association to Employees;
  toEmployee        : Association to Employees;
  transitionDate    : Timestamp not null;
  notes             : String(500);
}

entity MaintenanceRecords : cuid, managed {
  asset           : Association to Assets not null;
  serviceVendor    : Association to Vendors;
  type             : String(80) not null;
  reportedDate     : Date not null;
  completedDate    : Date;
  status           : String(24) default 'OPEN';
  cost             : Decimal(13,2);
  outcome          : String(1000);
}

entity MaintenanceRequests : cuid, managed {
  asset           : Association to Assets not null;
  requestedBy     : String(255) not null;
  issueType       : String(60) not null;
  description     : String(2000) not null;
  priority        : String(12) default 'MEDIUM';
  status          : String(24) default 'SUBMITTED';
  submittedAt     : Timestamp not null;
  reviewedBy      : String(255);
  reviewedAt      : Timestamp;
  resolutionNotes : String(1000);
  maintenance     : Association to MaintenanceRecords;
}

entity ArchiveRecords : cuid, managed {
  asset          : Association to Assets not null;
  archivedAt     : Timestamp not null;
  archivedBy     : String(255);
  reason         : String(1000) not null;
  disposalMethod : String(120);
}
