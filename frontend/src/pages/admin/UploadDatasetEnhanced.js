import React, { useState, useCallback, useMemo } from 'react';
import { Card, Button, Form, Alert, Spinner, Row, Col, Modal, Badge, Table } from 'react-bootstrap';
import { uploadAPI } from '../../services/api';
import { APP_CONFIG, DATASET_TYPES } from '../../utils/constants';
import '../../styles/UploadDataset.css';

const UploadDatasetEnhanced = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [datasetType, setDatasetType] = useState(DATASET_TYPES.SALES_DATA);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [csvPreview, setCsvPreview] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [uploadedDatasets, setUploadedDatasets] = useState([]);
  const [currentDataset, setCurrentDataset] = useState(null);

  // Parse CSV file for preview
  const parseCSVPreview = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0] ? lines[0].split(',').map(h => h.trim().replace(/"/g, '')) : [];
      
      const previewData = lines.slice(1, 11).map((line, index) => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const row = {};
        headers.forEach((header, i) => {
          row[header] = values[i] || '';
        });
        return row;
      });

      setCsvPreview({
        headers,
        rows: previewData,
        totalRows: lines.length - 1,
        fileName: file.name
      });
    };
    reader.readAsText(file);
  }, []);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      if (!allowedTypes.includes(file.type)) {
        setError('Please select a CSV or Excel file');
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      
      setSelectedFile(file);
      setError('');
      setUploadResult(null);
      setCsvPreview(null);
      
      // Parse CSV for preview if it's a CSV file
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        parseCSVPreview(file);
      }
    }
  }, []);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      if (!allowedTypes.includes(file.type)) {
        setError('Please select a CSV or Excel file');
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      
      setSelectedFile(file);
      setError('');
      setUploadResult(null);
      setCsvPreview(null);
      
      // Parse CSV for preview if it's a CSV file
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        parseCSVPreview(file);
      }
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    setUploading(true);
    setError('');
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('dataset_type', datasetType);
      formData.append('overwrite_existing', overwriteExisting);

      const response = await uploadAPI.uploadDataset(formData);
      setUploadResult(response.data);
      setSelectedFile(null);
      setCsvPreview(null);
      
      // Add to uploaded datasets list
      const newDataset = {
        id: Date.now(),
        name: selectedFile.name,
        type: datasetType,
        uploadDate: new Date().toISOString(),
        records: response.data.records_processed
      };
      
      setUploadedDatasets(prev => [...prev, newDataset]);
      setCurrentDataset(newDataset);
      
      // Reset file input
      document.getElementById('file-input').value = '';
    } catch (error) {
      setError(error.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [selectedFile, datasetType, overwriteExisting]);

  const handleConfirmUpload = useCallback(async () => {
    setShowConfirmModal(false);
    await handleUpload();
  }, [handleUpload]);

  const handleVisualizationOnly = useCallback(() => {
    if (!csvPreview) {
      setError('No dataset to visualize');
      return;
    }

    // Create dataset for visualization only
    const visualizationDataset = {
      id: Date.now(),
      name: csvPreview.fileName,
      type: datasetType,
      uploadDate: new Date().toISOString(),
      records: csvPreview.totalRows,
      data: csvPreview.rows
    };

    setCurrentDataset(visualizationDataset);
    setUploadedDatasets(prev => [...prev, visualizationDataset]);
    setShowConfirmModal(false);
    setSelectedFile(null);
    setCsvPreview(null);
  }, [csvPreview, datasetType]);

  const resetForm = useCallback(() => {
    setSelectedFile(null);
    setUploadResult(null);
    setError('');
    setDatasetType(DATASET_TYPES.SALES_DATA);
    setOverwriteExisting(false);
    setCsvPreview(null);
    setCurrentDataset(null);
    document.getElementById('file-input').value = '';
  }, []);

  const getDatasetTypeInfo = (type) => {
    const info = {
      [DATASET_TYPES.SALES_DATA]: {
        name: 'Sales Data',
        description: 'Contains order information including customer details, products, quantities, and prices.',
        requiredColumns: ['order_date', 'customer_name', 'product_name', 'quantity', 'price'],
        sampleData: {
          headers: ['order_date', 'customer_name', 'product_name', 'quantity', 'price'],
          rows: [
            ['2026-03-08', 'John Doe', 'Product A', '2', '299.99'],
            ['2026-03-08', 'Jane Smith', 'Product B', '1', '499.99']
          ]
        }
      },
      [DATASET_TYPES.PRODUCT_DATA]: {
        name: 'Product Data',
        description: 'Contains product information including name, category, price, and stock quantity.',
        requiredColumns: ['product_name', 'category', 'price', 'stock_quantity'],
        sampleData: {
          headers: ['product_name', 'category', 'price', 'stock_quantity'],
          rows: [
            ['Product A', 'Electronics', '299.99', '50'],
            ['Product B', 'Clothing', '49.99', '100']
          ]
        }
      },
      [DATASET_TYPES.CUSTOMER_DATA]: {
        name: 'Customer Data',
        description: 'Contains customer information including name, shop details, and contact information.',
        requiredColumns: ['customer_name', 'shop_name', 'email', 'phone'],
        sampleData: {
          headers: ['customer_name', 'shop_name', 'email', 'phone'],
          rows: [
            ['John Doe', 'Shop A', 'john@example.com', '123-456-7890'],
            ['Jane Smith', 'Shop B', 'jane@example.com', '098-765-4321']
          ]
        }
      }
    };
    return info[type] || info[DATASET_TYPES.SALES_DATA];
  };

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold">Upload Dataset</h2>
        <Button variant="outline-secondary" onClick={resetForm}>
          <i className="bi bi-arrow-clockwise me-2"></i>
          Reset
        </Button>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Row>
        {/* Upload Section */}
        <Col lg={8}>
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Upload Dataset File</h5>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={(e) => { e.preventDefault(); }}>
                <Form.Group className="mb-3">
                  <Form.Label>Dataset Type *</Form.Label>
                  <Form.Select
                    value={datasetType}
                    onChange={(e) => setDatasetType(e.target.value)}
                  >
                    <option value={DATASET_TYPES.SALES_DATA}>Sales Data</option>
                    <option value={DATASET_TYPES.PRODUCT_DATA}>Product Data</option>
                    <option value={DATASET_TYPES.CUSTOMER_DATA}>Customer Data</option>
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Select File *</Form.Label>
                  <div
                    className={`border-dashed border-2 rounded p-4 text-center ${dragActive ? 'border-primary bg-light' : 'border-secondary'}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <i className="bi bi-cloud-upload display-4 text-muted"></i>
                    <p className="mt-2 mb-1">
                      Drag and drop your file here, or click to browse
                    </p>
                    <p className="text-muted small">
                      Supported formats: CSV, Excel (.xlsx, .xls)
                    </p>
                    <input
                      id="file-input"
                      type="file"
                      className="d-none"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileSelect}
                    />
                    <Button
                      variant="outline-primary"
                      onClick={() => document.getElementById('file-input').click()}
                    >
                      Choose File
                    </Button>
                  </div>
                  
                  {selectedFile && (
                    <div className="mt-3">
                      <Alert variant="info">
                        <i className="bi bi-file-earmark me-2"></i>
                        <strong>Selected File:</strong> {selectedFile.name}
                        <br />
                        <small className="text-muted">
                          Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </small>
                      </Alert>
                    </div>
                  )}
                  
                  <Form.Group className="mb-3">
                    <Form.Check
                      type="checkbox"
                      label="Overwrite existing records"
                      checked={overwriteExisting}
                      onChange={(e) => setOverwriteExisting(e.target.checked)}
                    />
                    <Form.Text className="text-muted">
                      Check this box to update existing records with matching identifiers
                    </Form.Text>
                  </Form.Group>

                  <div className="d-flex gap-2">
                    <Button
                      variant="outline-primary"
                      onClick={() => csvPreview && setShowConfirmModal(true)}
                      disabled={!csvPreview}
                    >
                      <i className="bi bi-eye me-2"></i>
                      Preview Only
                    </Button>
                    <Button
                      variant="primary"
                      type="submit"
                      size="lg"
                      disabled={!selectedFile || uploading}
                      className="w-100"
                    >
                      {uploading ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-upload me-2"></i>
                          Upload Dataset
                        </>
                      )}
                    </Button>
                  </div>
                </Form>
              </Card.Body>
          </Card>
        </Col>

        {/* Dataset Information */}
        <Col lg={4}>
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Dataset Information</h5>
            </Card.Header>
            <Card.Body>
              <h6>{getDatasetTypeInfo(datasetType).name}</h6>
              <p className="text-muted small">{getDatasetTypeInfo(datasetType).description}</p>
              
              <div className="mb-3">
                <strong>Required Columns:</strong>
                <ul className="small">
                  {getDatasetTypeInfo(datasetType).requiredColumns.map(col => (
                    <li key={col}>{col}</li>
                  ))}
                </ul>
              </div>

              <div className="mb-3">
                <strong>Sample Format:</strong>
                <div className="sample-format small">
                  <Table striped bordered size="sm">
                    <thead>
                      <tr>
                        {getDatasetTypeInfo(datasetType).sampleData.headers.map(header => (
                          <th key={header}>{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {getDatasetTypeInfo(datasetType).sampleData.rows.map((row, index) => (
                        <tr key={index}>
                          {getDatasetTypeInfo(datasetType).sampleData.headers.map(header => (
                            <td key={header}>{row[header]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* CSV Preview */}
      {csvPreview && (
        <Card className="mb-4">
          <Card.Header>
            <h5 className="mb-0">CSV Preview - {csvPreview.fileName}</h5>
            <Badge bg="info" className="ms-2">
              {csvPreview.totalRows} rows found
            </Badge>
          </Card.Header>
          <Card.Body>
            <div className="table-responsive">
              <Table striped bordered hover size="sm">
                <thead>
                  <tr>
                    {csvPreview.headers.map((header, index) => (
                      <th key={index}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvPreview.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {csvPreview.headers.map((header, colIndex) => (
                        <td key={colIndex}>{row[header]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
            {csvPreview.totalRows > 10 && (
              <Alert variant="info" className="mt-3">
                <i className="bi bi-info-circle me-2"></i>
                Showing first 10 rows of {csvPreview.totalRows} total rows
              </Alert>
            )}
          </Card.Body>
        </Card>
      )}

      {/* Upload Result */}
      {uploadResult && (
        <Alert variant="success">
          <Alert.Heading>Upload Successful!</Alert.Heading>
          <p>Dataset has been processed successfully.</p>
          <hr />
          <div className="mb-2">
            <strong>Dataset Type:</strong> {uploadResult.dataset_type}
          </div>
          <div className="mb-2">
            <strong>Records Processed:</strong> {uploadResult.records_processed}
          </div>
          {uploadResult.orders_created && (
            <div className="mb-2">
              <strong>Orders Created:</strong> {uploadResult.orders_created}
            </div>
          )}
          {uploadResult.customers_created && (
            <div className="mb-2">
              <strong>Customers Created:</strong> {uploadResult.customers_created}
            </div>
          )}
          {uploadResult.products_created && (
            <div className="mb-2">
              <strong>Products Created:</strong> {uploadResult.products_created}
            </div>
          )}
          {uploadResult.errors && uploadResult.errors.length > 0 && (
            <div className="mt-3">
              <strong>Errors:</strong>
              <ul className="mb-0">
                {uploadResult.errors.slice(0, 5).map((error, index) => (
                  <li key={index} className="text-warning">{error}</li>
                ))}
                {uploadResult.errors.length > 5 && (
                  <li className="text-muted">...and {uploadResult.errors.length - 5} more errors</li>
                )}
              </ul>
            </div>
          )}
        </Alert>
      )}

      {/* Confirmation Modal */}
      <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)}>
        <Modal.Header>
          <Modal.Title>Confirm Dataset Upload</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Do you want to upload this dataset to the database?</p>
          <p><strong>Dataset:</strong> {csvPreview?.fileName || selectedFile?.name}</p>
          <p><strong>Type:</strong> {getDatasetTypeInfo(datasetType).name}</p>
          <p><strong>Records:</strong> {csvPreview?.totalRows || 0}</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleVisualizationOnly}>
            Use for Visualization Only
          </Button>
          <Button variant="success" onClick={handleConfirmUpload}>
            Upload to Database
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default UploadDatasetEnhanced;
