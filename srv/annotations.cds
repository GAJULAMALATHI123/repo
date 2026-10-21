using AssetAdminService from './asset-service';
using AssetManagerService from './asset-service';
using AssetUserService from './asset-service';

annotate AssetAdminService.Assets with @(
  UI.HeaderInfo: { TypeName: 'Asset', TypeNamePlural: 'Assets', Title: { Value: assetTag }, Description: { Value: model } },
  UI.SelectionFields: [assetTag, status, category_ID, vendor_ID],
  UI.LineItem: [
    { Value: assetTag, Label: 'Asset Tag' },
    { Value: serialNumber, Label: 'Serial Number' },
    { Value: model, Label: 'Model' },
    { Value: category.name, Label: 'Category' },
    { Value: status, Label: 'Status' },
    { Value: purchaseDate, Label: 'Purchase Date' },
    { Value: currentHolder.fullName, Label: 'Current Holder' }
  ],
  UI.Identification: [
    { Value: assetTag, Label: 'Asset Tag' },
    { Value: serialNumber, Label: 'Serial Number' },
    { Value: model, Label: 'Model' },
    { Value: description, Label: 'Description' },
    { Value: status, Label: 'Status' }
  ]
);

annotate AssetManagerService.Assets with @(
  UI.HeaderInfo: { TypeName: 'Asset', TypeNamePlural: 'Assets', Title: { Value: assetTag }, Description: { Value: model } },
  UI.SelectionFields: [assetTag, status, category_ID],
  UI.LineItem: [
    { Value: assetTag, Label: 'Asset Tag' },
    { Value: model, Label: 'Model' },
    { Value: category.name, Label: 'Category' },
    { Value: status, Label: 'Status' },
    { Value: currentHolder.fullName, Label: 'Current Holder' }
  ]
);

annotate AssetUserService.Assets with @(
  UI.HeaderInfo: { TypeName: 'My Asset', TypeNamePlural: 'My Assets', Title: { Value: assetTag }, Description: { Value: model } },
  UI.SelectionFields: [assetTag, status],
  UI.LineItem: [
    { Value: assetTag, Label: 'Asset Tag' },
    { Value: model, Label: 'Model' },
    { Value: status, Label: 'Status' },
    { Value: warrantyExpiry, Label: 'Warranty Expiry' }
  ]
);

annotate AssetAdminService.MaintenanceRequests with @(
  UI.HeaderInfo: { TypeName: 'Maintenance Request', TypeNamePlural: 'Maintenance Requests', Title: { Value: issueType }, Description: { Value: status } },
  UI.SelectionFields: [status, priority, issueType],
  UI.LineItem: [
    { Value: asset.assetTag, Label: 'Asset' },
    { Value: requestedBy, Label: 'Requested By' },
    { Value: issueType, Label: 'Issue Type' },
    { Value: priority, Label: 'Priority' },
    { Value: status, Label: 'Status' },
    { Value: submittedAt, Label: 'Submitted At' },
    { Value: resolutionNotes, Label: 'Review / Resolution Notes' }
  ]
);

annotate AssetManagerService.MaintenanceRequests with @(
  UI.HeaderInfo: { TypeName: 'Maintenance Request', TypeNamePlural: 'Maintenance Requests', Title: { Value: issueType }, Description: { Value: status } },
  UI.SelectionFields: [status, priority, issueType],
  UI.LineItem: [
    { Value: asset.assetTag, Label: 'Asset' },
    { Value: issueType, Label: 'Issue Type' },
    { Value: priority, Label: 'Priority' },
    { Value: status, Label: 'Status' },
    { Value: submittedAt, Label: 'Submitted At' }
  ]
);

annotate AssetUserService.MaintenanceRequests with @(
  UI.HeaderInfo: { TypeName: 'My Maintenance Request', TypeNamePlural: 'My Maintenance Requests', Title: { Value: issueType }, Description: { Value: status } },
  UI.SelectionFields: [status, priority],
  UI.LineItem: [
    { Value: asset.assetTag, Label: 'Asset' },
    { Value: issueType, Label: 'Issue Type' },
    { Value: description, Label: 'Description' },
    { Value: priority, Label: 'Priority' },
    { Value: status, Label: 'Status' },
    { Value: submittedAt, Label: 'Submitted At' },
    { Value: resolutionNotes, Label: 'Resolution' }
  ]
);

annotate AssetAdminService.MaintenanceRecords with @(
  UI.HeaderInfo: { TypeName: 'Maintenance Record', TypeNamePlural: 'Maintenance Records', Title: { Value: type }, Description: { Value: status } },
  UI.SelectionFields: [status, type, reportedDate],
  UI.LineItem: [
    { Value: asset.assetTag, Label: 'Asset' },
    { Value: type, Label: 'Maintenance Type' },
    { Value: reportedDate, Label: 'Reported Date' },
    { Value: completedDate, Label: 'Completed Date' },
    { Value: status, Label: 'Status' },
    { Value: cost, Label: 'Cost' },
    { Value: outcome, Label: 'Outcome' }
  ]
);

annotate AssetManagerService.MaintenanceRecords with @(
  UI.HeaderInfo: { TypeName: 'Maintenance Record', TypeNamePlural: 'Maintenance Records', Title: { Value: type }, Description: { Value: status } },
  UI.SelectionFields: [status, type],
  UI.LineItem: [
    { Value: asset.assetTag, Label: 'Asset' },
    { Value: type, Label: 'Maintenance Type' },
    { Value: reportedDate, Label: 'Reported Date' },
    { Value: completedDate, Label: 'Completed Date' },
    { Value: status, Label: 'Status' },
    { Value: cost, Label: 'Cost' }
  ]
);

annotate AssetAdminService.AssetAssignments with @(
  UI.HeaderInfo: { TypeName: 'Assignment', TypeNamePlural: 'Asset Assignments', Title: { Value: asset.assetTag }, Description: { Value: assignmentStatus } },
  UI.SelectionFields: [assignmentStatus, assignedDate],
  UI.LineItem: [
    { Value: asset.assetTag, Label: 'Asset' },
    { Value: employee.fullName, Label: 'Employee' },
    { Value: assignedDate, Label: 'Assigned Date' },
    { Value: expectedReturnDate, Label: 'Expected Return' },
    { Value: actualReturnDate, Label: 'Actual Return' },
    { Value: assignmentStatus, Label: 'Status' }
  ]
);

annotate AssetAdminService.Employees with @(
  UI.HeaderInfo: { TypeName: 'Employee', TypeNamePlural: 'Employees', Title: { Value: fullName }, Description: { Value: employeeNumber } },
  UI.SelectionFields: [fullName, email, status],
  UI.LineItem: [
    { Value: employeeNumber, Label: 'Employee Number' },
    { Value: fullName, Label: 'Name' },
    { Value: email, Label: 'Email' },
    { Value: department.name, Label: 'Department' },
    { Value: status, Label: 'Status' }
  ]
);

annotate AssetAdminService.AssetCategories with @(
  UI.HeaderInfo: { TypeName: 'Asset Category', TypeNamePlural: 'Asset Categories', Title: { Value: name } },
  UI.LineItem: [
    { Value: name, Label: 'Category' },
    { Value: lifespanMonths, Label: 'Lifespan (Months)' },
    { Value: isActive, Label: 'Active' }
  ]
);

annotate AssetAdminService.Vendors with @(
  UI.HeaderInfo: { TypeName: 'Vendor', TypeNamePlural: 'Vendors', Title: { Value: name } },
  UI.LineItem: [
    { Value: name, Label: 'Vendor' },
    { Value: email, Label: 'Email' },
    { Value: phone, Label: 'Phone' },
    { Value: isActive, Label: 'Active' }
  ]
);

annotate AssetAdminService.Departments with @(
  UI.HeaderInfo: { TypeName: 'Department', TypeNamePlural: 'Departments', Title: { Value: name } },
  UI.LineItem: [
    { Value: name, Label: 'Department' },
    { Value: costCenter, Label: 'Cost Center' },
    { Value: headPerson, Label: 'Department Head' },
    { Value: isActive, Label: 'Active' }
  ]
);
