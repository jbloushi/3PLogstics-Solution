import React from 'react';
import styled from 'styled-components';
import Card from './Card';
import Input from './Input';
import Select from './Select';
import Button from './Button';

const Grid = styled.div`
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr;
  
  @media (min-width: 768px) {
    grid-template-columns: repeat(${props => props.$cols || 1}, 1fr);
  }
`;

const AddressPanel = ({
    title,
    variant = 'default',
    values = {},
    onChange,
    errors = {},
    disabled = false,
    onCopy,
    isStaff
}) => {

    // Helper to update specific field
    const updateField = (field, value) => {
        onChange({
            ...values,
            [field]: value
        });
    };

    // Actions for the Card header
    const cardActions = (
        <>
            {onCopy && (
                <Button variant="icon" onClick={onCopy} title="Copy to Receiver" type="button">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                </Button>
            )}
            <Button variant="icon" title="Collapse" type="button">
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                </svg>
            </Button>
        </>
    );

    return (
        <Card title={title} variant={variant} actions={cardActions}>
            <Grid>
                {/* Address Book Loader */}
                {values.savedAddresses && values.savedAddresses.length > 0 && (
                    <Select
                        label="📂 Load from Address Book"
                        value=""
                        onChange={(e) => {
                            const selected = values.savedAddresses.find(a => a._id === e.target.value);
                            if (selected && onChange) {
                                onChange({
                                    ...values,
                                    company: selected.company || '',
                                    contactPerson: selected.contactPerson || '',
                                    streetLines: selected.streetLines || [],
                                    city: selected.city || '',
                                    state: selected.state || '',
                                    postalCode: selected.postalCode || '',
                                    countryCode: selected.countryCode || 'KW',
                                    phone: selected.phone || '',
                                    phoneCountryCode: selected.phoneCountryCode || '+965',
                                    email: selected.email || '',
                                    vatNumber: selected.vatNumber || '',
                                    eoriNumber: selected.eoriNumber || '',
                                    taxId: selected.taxId || '',
                                    traderType: selected.traderType || 'business',
                                    reference: selected.reference || '',
                                    // Maintain the saved addresses list
                                    savedAddresses: values.savedAddresses
                                });
                            }
                        }}
                    >
                        <option value="">Select saved address...</option>
                        {values.savedAddresses.map(addr => (
                            <option key={addr._id} value={addr._id}>
                                {addr.label || addr.company || addr.contactPerson} - {addr.city}
                            </option>
                        ))}
                    </Select>
                )}

                <Input
                    label="Company Name"
                    placeholder="Company name"
                    value={values.company || ''}
                    onChange={(e) => updateField('company', e.target.value)}
                    disabled={disabled}
                    icon={
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    }
                />

                <Grid $cols={2}>
                    <Select
                        label="Trader Type"
                        value={values.traderType || 'business'}
                        onChange={(e) => updateField('traderType', e.target.value)}
                        disabled={disabled}
                    >
                        <option value="business">Business</option>
                        <option value="private">Individual</option>
                    </Select>
                    <Input
                        label="Tax ID / EIN"
                        placeholder="Tax ID"
                        value={values.taxId || ''}
                        onChange={(e) => updateField('taxId', e.target.value)}
                        disabled={disabled}
                    />
                </Grid>

                <Input
                    label="Contact Person *"
                    value={values.contactPerson || ''}
                    onChange={(e) => updateField('contactPerson', e.target.value)}
                    disabled={disabled}
                    error={errors.contactPerson}
                    icon={
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    }
                />

                <Grid $cols={3}>
                    <Select
                        label="Code"
                        value={values.phoneCountryCode || '+965'}
                        onChange={(e) => updateField('phoneCountryCode', e.target.value)}
                        disabled={disabled}
                    >
                        <option value="+965">🇰🇼 +965</option>
                        <option value="+971">🇦🇪 +971</option>
                        <option value="+966">🇸🇦 +966</option>
                        {/* Add more as needed */}
                    </Select>
                    <div style={{ gridColumn: 'span 2' }}>
                        <Input
                            label="Phone Number *"
                            value={values.phone || ''}
                            onChange={(e) => updateField('phone', e.target.value.replace(/\D/g, ''))}
                            disabled={disabled}
                            error={errors.phone}
                        />
                    </div>
                </Grid>

                <Input
                    label="Email"
                    type="email"
                    value={values.email || ''}
                    onChange={(e) => updateField('email', e.target.value)}
                    disabled={disabled}
                    error={errors.email}
                />

                <Grid $cols={2}>
                    <Input
                        label="Reference"
                        placeholder="e.g. PO-12345"
                        value={values.reference || ''}
                        onChange={(e) => updateField('reference', e.target.value)}
                        disabled={disabled}
                    />
                    <Input
                        label="VAT Number"
                        value={values.vatNumber || ''}
                        onChange={(e) => updateField('vatNumber', e.target.value)}
                        disabled={disabled}
                    />
                </Grid>

                {/* Address Section */}
                <Input
                    label="Search Address"
                    placeholder="Start typing..."
                    icon={
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    }
                />

                <Input
                    label="Street Address"
                    value={values.streetLines?.[0] || ''}
                    onChange={(e) => updateField('streetLines', [e.target.value, values.streetLines?.[1] || ''])}
                    disabled={disabled}
                    error={errors.street}
                />

                <Grid $cols={2}>
                    <Input
                        label="Unit / Floor"
                        value={values.unitNumber || ''}
                        onChange={(e) => updateField('unitNumber', e.target.value)}
                        disabled={disabled}
                    />
                    <Input
                        label="Building Name"
                        value={values.buildingName || ''}
                        onChange={(e) => updateField('buildingName', e.target.value)}
                        disabled={disabled}
                    />
                </Grid>

                <Grid $cols={2}>
                    <Input
                        label="Area / Block"
                        value={values.area || ''}
                        onChange={(e) => updateField('area', e.target.value)}
                        disabled={disabled}
                    />
                    <Input
                        label="City *"
                        value={values.city || ''}
                        onChange={(e) => updateField('city', e.target.value)}
                        disabled={disabled}
                        error={errors.city}
                    />
                </Grid>

                <Grid $cols={2}>
                    <Input
                        label="Postal Code *"
                        value={values.postalCode || ''}
                        onChange={(e) => updateField('postalCode', e.target.value)}
                        disabled={disabled}
                        error={errors.postalCode}
                    />
                    <Select
                        label="Country"
                        value={values.countryCode || 'KW'}
                        onChange={(e) => updateField('countryCode', e.target.value)}
                        disabled={disabled}
                    >
                        <option value="KW">Kuwait</option>
                        <option value="AE">UAE</option>
                        <option value="SA">Saudi Arabia</option>
                        <option value="US">United States</option>
                        <option value="GB">United Kingdom</option>
                    </Select>
                </Grid>
            </Grid>
        </Card>
    );
};

export default AddressPanel;
