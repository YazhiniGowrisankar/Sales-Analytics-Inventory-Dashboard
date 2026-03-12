import React, { useState, useCallback } from 'react';
import { Card, Button, Form, Alert, Spinner, Row, Col, Modal, Badge, Table } from 'react-bootstrap';
import { uploadAPI } from '../../services/api';
import { DATASET_TYPES } from '../../utils/constants';
import '../../styles/EnhancedAnalytics.css';

const UploadDataset = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [datasetType, setDatasetType] = useState(DATASET_TYPES.SALES_DATA);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [csvPreview, setCsvPreview] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const parseCSVText = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0] ? lines[0].split(',').map(h => h.trim().replace(/"/g, '')) : [];

    const rows = lines.slice(1).map((line) => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const row = {};
      headers.forEach((header, i) => {
        row[header] = values[i] || '';
      });
      return row;
    });

    return { headers, rows };
  };

  // Parse CSV file for preview
  const parseCSVPreview = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const { headers, rows } = parseCSVText(text);
      const previewData = rows.slice(0, 10);

      setCsvPreview({
        headers,
        rows: previewData,
        allRows: rows,
        totalRows: rows.length,
        fileName: file.name,
      });
      setShowConfirmModal(true);
    };
    reader.readAsText(file);
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      if (!allowedTypes.includes(file.type)) {
        setError('Please select a CSV or Excel file');
        return;
      }
      
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      
      setSelectedFile(file);
      setError('');
      setUploadResult(null);
      
      // Parse CSV for preview if it's a CSV file
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        parseCSVPreview(file);
      }
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      
      // Validate file type
      const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      if (!allowedTypes.includes(file.type)) {
        setError('Please select a CSV or Excel file');
        return;
      }
      
      // Validate file size
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      
      setSelectedFile(file);
      setError('');
      setUploadResult(null);
      
      // Parse CSV for preview if it's a CSV file
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        parseCSVPreview(file);
      }
    }
  };

  const handleUpload = async () => {
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
      
      // Reset file input
      document.getElementById('file-input').value = '';
    } catch (error) {
      setError(error.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = async (type) => {
    try {
      const response = await uploadAPI.downloadTemplate(type);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_template.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setError('Failed to download template');
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setUploadResult(null);
    setError('');
    setDatasetType(DATASET_TYPES.SALES_DATA);
    setOverwriteExisting(false);
    document.getElementById('file-input').value = '';
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

      <Row>
        <Col lg={8}>
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Upload Dataset File</h5>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={(e) => { e.preventDefault(); handleUpload(); }}>
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
                  
                  {/* CSV Preview */}
                  {csvPreview && (
                    <Card className="mt-3">
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
                </Form.Group>

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
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Download Templates</h5>
            </Card.Header>
            <Card.Body>
              <p className="text-muted mb-3">
                Download sample templates to understand the required format for each dataset type.
              </p>
              
              <div className="d-grid gap-2">
                <Button
                  variant="outline-primary"
                  onClick={() => downloadTemplate(DATASET_TYPES.SALES_DATA)}
                >
                  <i className="bi bi-download me-2"></i>
                  Sales Data Template
                </Button>
                <Button
                  variant="outline-primary"
                  onClick={() => downloadTemplate(DATASET_TYPES.PRODUCT_DATA)}
                >
                  <i className="bi bi-download me-2"></i>
                  Product Data Template
                </Button>
                <Button
                  variant="outline-primary"
                  onClick={() => downloadTemplate(DATASET_TYPES.CUSTOMER_DATA)}
                >
                  <i className="bi bi-download me-2"></i>
                  Customer Data Template
                </Button>
              </div>
            </Card.Body>
          </Card>

          <Card>
            <Card.Header>
              <h5 className="mb-0">Dataset Information</h5>
            </Card.Header>
            <Card.Body>
              <h6>Sales Data</h6>
              <p className="text-muted small">
                Contains order information including customer details, products, quantities, and prices.
              </p>
              
              <h6>Product Data</h6>
              <p className="text-muted small">
                Contains product information including name, category, price, and stock quantity.
              </p>
              
              <h6>Customer Data</h6>
              <p className="text-muted small">
                Contains customer information including name, shop details, and contact information.
              </p>
              
              <Alert variant="info" className="mt-3">
                <small>
                  <strong>Note:</strong> Make sure your data follows the template format for successful processing.
                </small>
              </Alert>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Confirmation Modal */}
      <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)}>
        <Modal.Header>
          <Modal.Title>Dataset Upload Options</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Choose what you want to do with this dataset:</p>
          <p><strong>File:</strong> {csvPreview?.fileName || selectedFile?.name}</p>
          <p><strong>Type:</strong> {datasetType}</p>
          <p><strong>Records:</strong> {csvPreview?.totalRows || 0}</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>
            Cancel
          </Button>
          <Button variant="outline-primary" onClick={() => {
            // Use for visualization only - save to localStorage
            if (csvPreview) {
              const visualizationDataset = {
                id: Date.now(),
                name: csvPreview.fileName,
                type: datasetType,
                uploadDate: new Date().toISOString(),
                records: csvPreview.totalRows,
                data: csvPreview.allRows || csvPreview.rows
              };
              
              // Save to localStorage for visualization
              const existingDatasets = JSON.parse(localStorage.getItem('uploadedDatasets') || '[]');
              const updatedDatasets = [...existingDatasets, visualizationDataset];
              localStorage.setItem('uploadedDatasets', JSON.stringify(updatedDatasets));
              
              // Show success message
              setUploadResult({
                success: true,
                message: 'Dataset saved for visualization',
                dataset_type: datasetType,
                records_processed: csvPreview.totalRows
              });
              
              // Reset form
              setSelectedFile(null);
              setCsvPreview(null);
              setShowConfirmModal(false);
            }
          }}>
            Use for Visualization Only
          </Button>
          <Button variant="primary" onClick={handleUpload}>
            Upload to Database
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default UploadDataset;
