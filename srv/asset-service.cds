using itam from '../db/schema';

@path: '/admin'
@requires: 'Admin'
service AssetAdminService {
  entity Assets              as projection on itam.Assets;
  entity Employees           as projection on itam.Employees;
  entity Departments         as projection on itam.Departments;
  entity AssetCategories     as projection on itam.AssetCategories;
  entity Vendors             as projection on itam.Vendors;
  entity AssetAssignments    as projection on itam.AssetAssignments;
  entity OwnershipLedgers    as projection on itam.OwnershipLedgers;
  entity MaintenanceRecords  as projection on itam.MaintenanceRecords;
  entity MaintenanceRequests as projection on itam.MaintenanceRequests;

  action assignAsset(assetID: UUID, employeeID: UUID, assignedDate: Date, expectedReturnDate: Date) returns String;
  action transferAsset(assetID: UUID, employeeID: UUID, transitionDate: Date) returns String;
  action returnAsset(assetID: UUID, returnDate: Date) returns String;
  action startMaintenance(assetID: UUID, maintenanceType: String, requestID: UUID) returns String;
  action completeMaintenance(maintenanceID: UUID, completedDate: Date, outcome: String, cost: Decimal(13,2)) returns String;
  action retireAsset(assetID: UUID, reason: String, retirementDate: Date) returns String;
  action archiveAsset(assetID: UUID, reason: String, disposalMethod: String) returns String;
  action reviewMaintenanceRequest(requestID: UUID, decision: String, notes: String) returns String;
}

@path: '/manager'
@requires: 'Manager'
service AssetManagerService {
  @readonly entity Assets              as projection on itam.Assets;
  @readonly entity Employees           as projection on itam.Employees;
  @readonly entity Departments         as projection on itam.Departments;
  @readonly entity AssetCategories     as projection on itam.AssetCategories;
  @readonly entity Vendors             as projection on itam.Vendors;
  @readonly entity AssetAssignments    as projection on itam.AssetAssignments;
  @readonly entity OwnershipLedgers    as projection on itam.OwnershipLedgers;
  @readonly entity MaintenanceRecords  as projection on itam.MaintenanceRecords;
  @readonly entity MaintenanceRequests as projection on itam.MaintenanceRequests;
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
