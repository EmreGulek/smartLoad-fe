import { useState } from 'react';
import { Modal, Form, Button, Table, Alert } from 'react-bootstrap';
import { FaCheck } from 'react-icons/fa';

/**
 * Column Mapping Dialog — user picks which grid column maps to which canonical Package field.
 * Validation only starts after mapping is confirmed.
 */
export default function ColumnMappingDialog({ headers, onConfirm, onCancel }) {
  const [mapping, setMapping] = useState({
    pieces: null,
    grossWeightKg: null,
    lengthCm: null,
    widthCm: null,
    heightCm: null,
    destinationCode: null,
    stackable: null,
    rotatable: null,
    toploadable: null,
    canMix: null,
    specialHandling: null,
    dgClass: null,
    uldPreference: null,
  });

  const requiredFields = ['pieces', 'grossWeightKg', 'lengthCm', 'widthCm', 'heightCm', 'destinationCode'];
  const optionalFields = ['stackable', 'rotatable', 'toploadable', 'canMix', 'specialHandling', 'dgClass', 'uldPreference'];

  const fieldLabels = {
    pieces: 'Pieces / PCS / ADET',
    grossWeightKg: 'Gross weight (kg) / GROSS WEIGHT / BRUT',
    lengthCm: 'Length (cm) / LENGTH / LENGHT',
    widthCm: 'Width (cm) / WIDTH',
    heightCm: 'Height (cm) / HEIGHT',
    destinationCode: 'Destination (IATA) / DESTINATION',
    stackable: 'Stackable (YES/NO)',
    rotatable: 'Rotatable (YES/NO) / TURNABLE',
    toploadable: 'Top-loadable (YES/NO)',
    canMix: 'Can mix with other cargo (YES/NO)',
    specialHandling: 'Special handling code (DG, AVI, FRA, …)',
    dgClass: 'Dangerous goods class',
    uldPreference: 'ULD type preference',
  };

  // Check if all required fields are mapped
  const allRequiredMapped = requiredFields.every((f) => mapping[f] !== null);

  const handleFieldChange = (field, value) => {
    setMapping((prev) => ({ ...prev, [field]: value === '' ? null : parseInt(value) }));
  };

  const handleConfirm = () => {
    if (!allRequiredMapped) {
      alert('Please map every required field before continuing.');
      return;
    }
    onConfirm(mapping);
  };

  // Get preview values for a selected column
  const getPreviewValues = (colIdx) => {
    if (colIdx === null || !headers[colIdx]) return [];
    return `Column ${colIdx + 1}: "${headers[colIdx]}"`;
  };

  // Helper that colors required vs optional rows
  const getFieldClass = (fieldName) => {
    if (requiredFields.includes(fieldName)) return 'text-danger fw-bold';
    return 'text-muted';
  };

  return (
    <Modal show centered backdrop="static" size="lg">
      <Modal.Header closeButton={false}>
        <Modal.Title>Column Mapping</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Alert variant="info" className="mb-3">
          <strong>Step 1:</strong> Match your Excel columns to the system fields.
          <br />
          <span className="text-danger">Red fields are required</span>; gray ones are optional.
        </Alert>

        <div className="table-responsive">
          <Table bordered size="sm">
            <thead>
              <tr>
                <th>Field</th>
                <th>Column selection</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {/* Required fields */}
              {requiredFields.map((field) => (
                <tr key={field}>
                  <td className={getFieldClass(field)}>{fieldLabels[field]}</td>
                  <td>
                    <div>
                      <Form.Select
                        size="sm"
                        value={mapping[field] ?? ''}
                        onChange={(e) => handleFieldChange(field, e.target.value)}
                      >
                        <option value="">— Select —</option>
                        {headers.map((header, idx) => (
                          <option key={idx} value={idx}>
                            Column {idx + 1}: {header}
                          </option>
                        ))}
                      </Form.Select>
                      {mapping[field] !== null && (
                        <small className="text-muted d-block mt-1">
                          ✓ {getPreviewValues(mapping[field])}
                        </small>
                      )}
                    </div>
                  </td>
                  <td className="text-center">
                    {mapping[field] !== null ? (
                      <span className="badge bg-success">
                        <FaCheck /> Mapped
                      </span>
                    ) : (
                      <span className="badge bg-danger">Required</span>
                    )}
                  </td>
                </tr>
              ))}

              {/* Optional fields */}
              {optionalFields.map((field) => (
                <tr key={field}>
                  <td className="text-muted">{fieldLabels[field]}</td>
                  <td>
                    <Form.Select
                      size="sm"
                      value={mapping[field] ?? ''}
                      onChange={(e) => handleFieldChange(field, e.target.value)}
                    >
                      <option value="">— Leave empty —</option>
                      {headers.map((header, idx) => (
                        <option key={idx} value={idx}>
                          Column {idx + 1}: {header}
                        </option>
                      ))}
                    </Form.Select>
                  </td>
                  <td className="text-center">
                    {mapping[field] !== null ? (
                      <span className="badge bg-secondary">Mapped</span>
                    ) : (
                      <span className="badge bg-light text-dark">Optional</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>

        {/* Preview: selected columns */}
        <div className="mt-3 p-2 bg-light rounded">
          <small className="fw-bold">Selected mappings:</small>
          <div className="small mt-2">
            {requiredFields.map((field) => (
              <div key={field}>
                {fieldLabels[field]}: <span className="badge bg-info">{mapping[field] !== null ? `Column ${mapping[field] + 1}` : 'MISSING'}</span>
              </div>
            ))}
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleConfirm} disabled={!allRequiredMapped}>
          <FaCheck className="me-2" />
          Confirm mapping & validate
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
