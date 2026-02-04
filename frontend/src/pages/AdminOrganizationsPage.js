import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useSnackbar } from 'notistack';
import { organizationService, userService } from '../services/api';
import {
    PageHeader,
    Card,
    Button,
    Input,
    Select,
    Modal,
    TableWrapper,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    StatusPill,
    Alert
} from '../ui';

// --- Styled Components ---

const ActionButton = styled.button`
    background: transparent;
    border: none;
    cursor: pointer;
    color: ${props => props.$color || 'var(--text-secondary)'};
    padding: 4px;
    transition: all 0.2s;
    &:hover { color: var(--text-primary); transform: scale(1.1); }
`;

const AdminOrganizationsPage = () => {
    const { enqueueSnackbar } = useSnackbar();
    const [orgs, setOrgs] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);

    // Dialog States
    const [openDialog, setOpenDialog] = useState(false);
    const [openMembersDialog, setOpenMembersDialog] = useState(false);
    const [editingOrg, setEditingOrg] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        taxId: '',
        type: 'BUSINESS',
        balance: 0,
        creditLimit: 0,
        active: true
    });

    const [selectedMemberToAdd, setSelectedMemberToAdd] = useState('');

    const fetchOrgs = useCallback(async () => {
        setLoading(true);
        try {
            const [orgRes, userRes] = await Promise.all([
                organizationService.getOrganizations(),
                userService.getUsers()
            ]);
            setOrgs(orgRes.data || []);
            setUsers(userRes.data || []);
        } catch (error) {
            console.error(error);
            enqueueSnackbar('Failed to load organizations', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    }, [enqueueSnackbar]);

    useEffect(() => {
        fetchOrgs();
    }, [fetchOrgs]);

    const handleOpenDialog = (org = null) => {
        if (org) {
            setEditingOrg(org);
            setFormData({
                name: org.name || '',
                taxId: org.taxId || '',
                type: org.type || 'BUSINESS',
                balance: org.balance || 0,
                creditLimit: org.creditLimit || 0,
                active: org.active ?? true
            });
        } else {
            setEditingOrg(null);
            setFormData({
                name: '',
                taxId: '',
                type: 'BUSINESS',
                balance: 0,
                creditLimit: 0,
                active: true
            });
        }
        setOpenDialog(true);
    };

    const handleSave = async () => {
        try {
            if (editingOrg) {
                await organizationService.updateOrganization(editingOrg._id, formData);
                enqueueSnackbar('Organization updated', { variant: 'success' });
            } else {
                await organizationService.createOrganization(formData);
                enqueueSnackbar('Organization created', { variant: 'success' });
            }
            setOpenDialog(false);
            fetchOrgs();
        } catch (error) {
            const msg = error.response?.data?.error || 'Failed to save organization';
            enqueueSnackbar(msg, { variant: 'error' });
        }
    };

    const handleAddMember = async () => {
        if (!selectedMemberToAdd) return;
        try {
            await organizationService.addMember(editingOrg._id, selectedMemberToAdd);
            enqueueSnackbar('Member added', { variant: 'success' });
            fetchOrgs();
            // Update local state to reflect change immediately
            const updatedOrgRes = await organizationService.getOrganization(editingOrg._id);
            setEditingOrg(updatedOrgRes.data);
            setSelectedMemberToAdd('');
        } catch (err) {
            const msg = err.response?.data?.error || 'Failed to add member';
            enqueueSnackbar(msg, { variant: 'error' });
        }
    };

    const handleRemoveMember = async (memberId) => {
        try {
            await organizationService.removeMember(editingOrg._id, memberId);
            enqueueSnackbar('Member removed', { variant: 'success' });
            fetchOrgs();
            setEditingOrg(prev => ({
                ...prev,
                members: prev.members.filter(m => m._id !== memberId)
            }));
        } catch (err) {
            enqueueSnackbar('Failed to remove member', { variant: 'error' });
        }
    };

    return (
        <div>
            <PageHeader
                title="Organization Management"
                description="Manage business entities, shared balances, and global markup configurations."
                action={
                    <Button variant="primary" onClick={() => handleOpenDialog()}>
                        New Organization
                    </Button>
                }
                secondaryAction={
                    <Button variant="secondary" onClick={fetchOrgs}>
                        Refresh
                    </Button>
                }
            />

            <Card>
                <TableWrapper>
                    <Table>
                        <Thead>
                            <Tr>
                                <Th>Company Name</Th>
                                <Th>Type</Th>
                                <Th>Members</Th>
                                <Th style={{ textAlign: 'right' }}>Balance</Th>
                                <Th style={{ textAlign: 'right' }}>Credit Limit</Th>
                                <Th style={{ textAlign: 'center' }}>Actions</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {loading ? (
                                <Tr><Td colSpan={6} style={{ textAlign: 'center' }}>Loading...</Td></Tr>
                            ) : orgs.map(org => (
                                <Tr key={org._id}>
                                    <Td>
                                        <div style={{ fontWeight: 'bold' }}>{org.name}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Tax ID: {org.taxId || 'N/A'}</div>
                                    </Td>
                                    <Td>
                                        <StatusPill status="info" text={org.type} />
                                    </Td>
                                    <Td>{org.members?.length || 0}</Td>
                                    <Td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold', color: (org.balance || 0) < 0 ? 'var(--accent-error)' : 'var(--accent-success)' }}>
                                        {Number(org.balance || 0).toFixed(3)} KD
                                    </Td>
                                    <Td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                                        {Number(org.creditLimit || 0).toFixed(3)} KD
                                    </Td>
                                    <Td style={{ textAlign: 'center' }}>
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                            <ActionButton $color="var(--accent-primary)" onClick={() => {
                                                setEditingOrg(org);
                                                setOpenMembersDialog(true);
                                            }}>
                                                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                                </svg>
                                            </ActionButton>
                                            <ActionButton $color="var(--accent-warning)" onClick={() => handleOpenDialog(org)}>
                                                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </ActionButton>
                                        </div>
                                    </Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                </TableWrapper>
            </Card>

            {/* Edit/Create Dialog */}
            <Modal
                isOpen={openDialog}
                onClose={() => setOpenDialog(false)}
                title={editingOrg ? 'Edit Organization' : 'Create New Organization'}
                width="600px"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setOpenDialog(false)}>Cancel</Button>
                        <Button variant="primary" onClick={handleSave}>{editingOrg ? 'Save Changes' : 'Create Organization'}</Button>
                    </>
                }
            >
                <div style={{ display: 'grid', gap: '16px' }}>
                    <Input
                        label="Organization Name"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <Input
                            label="Tax / EORI ID"
                            value={formData.taxId}
                            onChange={e => setFormData({ ...formData, taxId: e.target.value })}
                        />
                        <Select
                            label="Type"
                            value={formData.type}
                            onChange={e => setFormData({ ...formData, type: e.target.value })}
                        >
                            <option value="BUSINESS">Business</option>
                            <option value="INDIVIDUAL">Individual</option>
                            <option value="GOVERNMENT">Government</option>
                        </Select>
                    </div>

                    <Card title="Finance Settings" variant="subtle">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <Input
                                label="Initial Balance (KD)"
                                type="number"
                                value={formData.balance}
                                onChange={e => setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })}
                            />
                            <Input
                                label="Credit Limit (KD)"
                                type="number"
                                value={formData.creditLimit}
                                onChange={e => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                    </Card>
                </div>
            </Modal>

            {/* Members Dialog */}
            <Modal
                isOpen={openMembersDialog}
                onClose={() => setOpenMembersDialog(false)}
                title={`Members of ${editingOrg?.name || 'Organization'}`}
                width="700px"
                footer={
                    <Button variant="secondary" onClick={() => setOpenMembersDialog(false)}>Close</Button>
                }
            >
                <div style={{ marginBottom: '24px' }}>
                    <TableWrapper>
                        <Table>
                            <Thead>
                                <Tr>
                                    <Th>Name</Th>
                                    <Th>Email</Th>
                                    <Th>Role</Th>
                                    <Th style={{ textAlign: 'right' }}>Action</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {editingOrg?.members?.map(member => (
                                    <Tr key={member._id}>
                                        <Td>{member.name}</Td>
                                        <Td>{member.email}</Td>
                                        <Td><StatusPill text={member.role} status="neutral" /></Td>
                                        <Td style={{ textAlign: 'right' }}>
                                            <ActionButton $color="var(--accent-error)" onClick={() => handleRemoveMember(member._id)}>
                                                Remove
                                            </ActionButton>
                                        </Td>
                                    </Tr>
                                ))}
                                {(!editingOrg?.members || editingOrg.members.length === 0) && (
                                    <Tr><Td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No members found</Td></Tr>
                                )}
                            </Tbody>
                        </Table>
                    </TableWrapper>
                </div>

                <Card title="Add Member" variant="subtle">
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1 }}>
                            <Select
                                label="Select User to Add"
                                value={selectedMemberToAdd}
                                onChange={e => setSelectedMemberToAdd(e.target.value)}
                            >
                                <option value="">-- Select User --</option>
                                {users
                                    .filter(u => !editingOrg?.members?.some(m => m._id === u._id) && !u.organization)
                                    .map(u => (
                                        <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
                                    ))
                                }
                            </Select>
                        </div>
                        <Button variant="primary" onClick={handleAddMember} disabled={!selectedMemberToAdd}>
                            Add
                        </Button>
                    </div>
                </Card>
            </Modal>
        </div>
    );
};

export default AdminOrganizationsPage;
