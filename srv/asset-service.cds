using itam from '../db/schema';

type ReportRow {
  assetTag     : String(50);
  serialNumber : String(100);
  model        : String(120);
  category     : String(100);
  status       : String(40);
  owner        : String(120);
  location     : String(120);
  date         : String(40);
  details      : String(500);
}

type ReportFile {
  fileName    : String(255);
  contentType : String(100);
  generatedAt : Timestamp;
  base64      : LargeString;
}

@path: '/admin'
@requires: 'Admin'
service AssetAdminService {
  entity Assets              as projection on itam.Assets;
  entity Employees           as projection on itam.Employees;
  entity Departments         as projection on itam.Departments;
  entity AssetCategories     as projection on itam.AssetCategories;
  entity Vendors             as projection on itam.Vendors;
  @readonly entity AssetAssignments    as projection on itam.AssetAssignments;
  @readonly entity OwnershipLedgers    as projection on itam.OwnershipLedgers;
  @readonly entity MaintenanceRecords  as projection on itam.MaintenanceRecords;
  @readonly entity MaintenanceRequests as projection on itam.MaintenanceRequests;
  @readonly entity ArchiveRecords      as projection on itam.ArchiveRecords;

  action assignAsset(assetID: UUID, employeeID: UUID, assignedDate: Date, expectedReturnDate: Date) returns String;
  action transferAsset(assetID: UUID, employeeID: UUID, transitionDate: Date) returns String;
  action returnAsset(assetID: UUID, returnDate: Date) returns String;
  action startMaintenance(assetID: UUID, maintenanceType: String, requestID: UUID) returns String;
  action completeMaintenance(maintenanceID: UUID, completedDate: Date, outcome: String, cost: Decimal(13,2)) returns String;
  action retireAsset(assetID: UUID, reason: String, retirementDate: Date) returns String;
  action archiveAsset(assetID: UUID, reason: String, disposalMethod: String) returns String;
  action reviewMaintenanceRequest(requestID: UUID, decision: String, notes: String) returns String;
  action getReportData(reportType: String, status: String, categoryID: UUID, location: String, dateFrom: Date, dateTo: Date) returns many ReportRow;
  action generateReport(reportType: String, status: String, categoryID: UUID, location: String, dateFrom: Date, dateTo: Date) returns ReportFile;
  action emailReport(reportType: String, status: String, categoryID: UUID, location: String, dateFrom: Date, dateTo: Date, recipients: String) returns String;
}

@path: '/user'
@requires: 'User'
service AssetUserService {
  @readonly entity Assets           as projection on itam.Assets;
  @readonly entity AssetAssignments as projection on itam.AssetAssignments;
  @readonly entity OwnershipLedgers  as projection on itam.OwnershipLedgers;

  entity MaintenanceRequests as projection on itam.MaintenanceRequests actions {
    @requires: 'User'
    action submitRequest(assetID: UUID, issueType: String, description: String, priority: String) returns String;
  };
}
