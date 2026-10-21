using itam from '../db/schema';
using { ReportRow, ReportFile } from './asset-service';

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
  action getReportData(reportType: String, status: String, categoryID: UUID, location: String, dateFrom: Date, dateTo: Date) returns many ReportRow;
  action generateReport(reportType: String, status: String, categoryID: UUID, location: String, dateFrom: Date, dateTo: Date) returns ReportFile;
  action emailReport(reportType: String, status: String, categoryID: UUID, location: String, dateFrom: Date, dateTo: Date, recipients: String) returns String;
}
