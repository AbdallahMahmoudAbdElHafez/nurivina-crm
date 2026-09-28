import React, { useEffect, useState } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    MenuItem,
    TextField,
    Typography,
    IconButton,
    Chip,
    Stack,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { MaterialReactTable } from 'material-react-table';
import {
    fetchVisitPlans,
    addVisitPlan,
    deleteVisitPlan,
} from '../features/visitPlans/visitPlansSlice';
import { fetchDoctors } from '../features/doctors/doctorsSlice';
import { fetchClinics } from '../features/clinics/clinicsSlice';

const daysOfWeek = [
    'Saturday',
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
];

export default function VisitPlansTable() {
    const dispatch = useDispatch();
    const { list, status } = useSelector((s) => s.visitPlans);
    const { list: doctors } = useSelector((s) => s.doctors);
    const { list: clinics } = useSelector((s) => s.clinics);

    const [openDialog, setOpenDialog] = useState(false);
    const [newPlan, setNewPlan] = useState({
        doctor_id: '',
        clinic_id: '',
        marketClass: '',
        visit_frequency: '',
        schedules: [],
    });
    const [schedule, setSchedule] = useState({
        visit_day: '',
        time_from: '',
        time_to: '',
    });

    useEffect(() => {
        dispatch(fetchVisitPlans());
        dispatch(fetchDoctors());
        dispatch(fetchClinics());
    }, [dispatch]);

    const handleAddSchedule = () => {
        if (schedule.visit_day && schedule.time_from && schedule.time_to) {
            setNewPlan((p) => ({
                ...p,
                schedules: [...p.schedules, schedule],
            }));
            setSchedule({ visit_day: '', time_from: '', time_to: '' });
        }
    };

    const handleRemoveSchedule = (index) => {
        setNewPlan((p) => ({
            ...p,
            schedules: p.schedules.filter((_, i) => i !== index),
        }));
    };

    const handleSavePlan = () => {
        if (newPlan.doctor_id && newPlan.schedules.length > 0) {
            dispatch(addVisitPlan(newPlan));
            setNewPlan({
                doctor_id: '',
                clinic_id: '',
                marketClass: '',
                visit_frequency: '',
                schedules: [],
            });
            setOpenDialog(false);
        }
    };

    const handleDelete = (plan) => {
        if (window.confirm(`هل تريد حذف خطة الطبيب رقم ${plan.id}؟`)) {
            dispatch(deleteVisitPlan(plan.id));
        }
    };

    const columns = [
        { accessorKey: 'id', header: 'ID', size: 60 },
        {
            id: 'sync_status',
            header: 'الحالة',
            size: 100,
            Cell: ({ row }) => {
                const isTemp = String(row.original.id).startsWith('temp_');
                return isTemp ? (
                    <span className="badge-status badge-pending">⏳ محلي</span>
                ) : (
                    <span className="badge-status badge-synced">✅ متزامن</span>
                );
            },
        },
        { accessorKey: 'doctor.name', header: 'الطبيب' },
        { accessorKey: 'clinic.clinic_name', header: 'العيادة' },
        { accessorKey: 'marketClass', header: 'Market Class' },
        { accessorKey: 'visit_frequency', header: 'التكرار' },
        { accessorKey: 'firstWeek', header: 'الأسبوع 1' },
        { accessorKey: 'secondWeek', header: 'الأسبوع 2' },
        { accessorKey: 'thirdWeek', header: 'الأسبوع 3' },
        { accessorKey: 'fourthWeek', header: 'الأسبوع 4' },
        { accessorKey: 'fifthWeek', header: 'الأسبوع 5' },
        {
            accessorKey: 'schedules',
            header: 'الأيام والأوقات',
            Cell: ({ row }) =>
                row.original.schedules?.length ? (
                    <Stack spacing={0.5}>
                        {row.original.schedules.map((s, idx) => (
                            <Chip
                                key={s.id || idx}
                                label={`${s.visit_day}: ${s.time_from} - ${s.time_to}`}
                                size="small"
                            />
                        ))}
                    </Stack>
                ) : (
                    '—'
                ),
        },
    ];

    return (
        <Box p={{ xs: 1, sm: 2 }}>
            <Typography variant="h6" mb={2} fontWeight="bold">
                📋 إدارة خطط الأطباء (CRM)
            </Typography>

            <Button
                startIcon={<Add />}
                variant="contained"
                color="primary"
                size="small"
                onClick={() => setOpenDialog(true)}
                sx={{ mb: 1.5 }}
            >
                إضافة خطة جديدة
            </Button>

            <div className="table-responsive-container">
                <MaterialReactTable
                    columns={columns}
                    data={list || []}
                    state={{ isLoading: status === 'loading' }}
                    enableRowActions
                    initialState={{ density: 'compact' }}
                    renderRowActions={({ row }) => (
                        <IconButton color="error" size="small" onClick={() => handleDelete(row.original)}>
                            <Delete fontSize="small" />
                        </IconButton>
                    )}
                />
            </div>

            {/* Dialog لإضافة الخطة مع توافق كامل للموبايل */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700, fontSize: '16px', pb: 1 }}>إضافة خطة جديدة</DialogTitle>
                <DialogContent>
                    <Stack spacing={1.5} mt={1}>
                        <TextField
                            select
                            size="small"
                            label="الطبيب"
                            value={newPlan.doctor_id}
                            onChange={(e) => setNewPlan({ ...newPlan, doctor_id: e.target.value })}
                            fullWidth
                        >
                            <MenuItem value="">اختر الطبيب</MenuItem>
                            {doctors.map((d) => (
                                <MenuItem key={d.id} value={d.id}>
                                    {d.name}
                                </MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            select
                            size="small"
                            label="العيادة"
                            value={newPlan.clinic_id}
                            onChange={(e) => setNewPlan({ ...newPlan, clinic_id: e.target.value })}
                            fullWidth
                        >
                            <MenuItem value="">اختر العيادة</MenuItem>
                            {clinics.map((c) => (
                                <MenuItem key={c.id} value={c.id}>
                                    {c.clinic_name}
                                </MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            size="small"
                            label="Market Class"
                            value={newPlan.marketClass}
                            onChange={(e) => setNewPlan({ ...newPlan, marketClass: e.target.value })}
                            fullWidth
                        />
                        <TextField
                            size="small"
                            type="number"
                            label="التكرار"
                            value={newPlan.visit_frequency}
                            onChange={(e) => setNewPlan({ ...newPlan, visit_frequency: e.target.value })}
                            fullWidth
                        />

                        <Typography variant="subtitle2" fontWeight="bold">
                            الأيام والأوقات
                        </Typography>

                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                            <TextField
                                select
                                size="small"
                                label="اليوم"
                                value={schedule.visit_day}
                                onChange={(e) => setSchedule({ ...schedule, visit_day: e.target.value })}
                                sx={{ flex: 1 }}
                            >
                                <MenuItem value="">اختر اليوم</MenuItem>
                                {daysOfWeek.map((day) => (
                                    <MenuItem key={day} value={day}>
                                        {day}
                                    </MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                size="small"
                                type="time"
                                label="من"
                                value={schedule.time_from}
                                onChange={(e) => setSchedule({ ...schedule, time_from: e.target.value })}
                                sx={{ flex: 1 }}
                                InputLabelProps={{ shrink: true }}
                            />
                            <TextField
                                size="small"
                                type="time"
                                label="إلى"
                                value={schedule.time_to}
                                onChange={(e) => setSchedule({ ...schedule, time_to: e.target.value })}
                                sx={{ flex: 1 }}
                                InputLabelProps={{ shrink: true }}
                            />
                            <IconButton color="primary" size="small" onClick={handleAddSchedule}>
                                <Add />
                            </IconButton>
                        </Stack>

                        {newPlan.schedules.length > 0 && (
                            <Stack spacing={1}>
                                {newPlan.schedules.map((s, i) => (
                                    <Stack
                                        key={i}
                                        direction="row"
                                        justifyContent="space-between"
                                        alignItems="center"
                                        sx={{
                                            p: 1,
                                            border: '1px solid #ddd',
                                            borderRadius: 1,
                                        }}
                                    >
                                        <Typography variant="body2">
                                            {s.visit_day}: {s.time_from} - {s.time_to}
                                        </Typography>
                                        <IconButton color="error" onClick={() => handleRemoveSchedule(i)}>
                                            <Delete />
                                        </IconButton>
                                    </Stack>
                                ))}
                            </Stack>
                        )}
                    </Stack>
                </DialogContent>

                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
                    <Button variant="contained" onClick={handleSavePlan}>
                        حفظ
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
