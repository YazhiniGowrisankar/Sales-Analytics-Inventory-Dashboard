import React from 'react';
import { Card } from 'react-bootstrap';

const DiagnosticAnalyticsTest = () => {
  return (
    <div className="diagnostic-analytics">
      <h2>Diagnostic Analytics - Test Version</h2>
      <Card className="mb-4">
        <Card.Body>
          <p>If you can see this page, the routing is working correctly.</p>
          <p>The issue is with the API calls in the original component.</p>
        </Card.Body>
      </Card>
    </div>
  );
};

export default DiagnosticAnalyticsTest;
