export const GROUP_STATUS = {
    PENDING_ACTIVATION: 'pending_activation',
    ACTIVE: 'active',
    PAUSED: 'paused',
    COMPLETED: 'completed',
    CLOSED: 'closed',
    CANCELLED: 'cancelled'
};

export const FREQUENCY_TYPE = {
    DAILY: 'daily',
    WEEKLY: 'weekly',
    BI_WEEKLY: 'bi_weekly',
    MONTHLY: 'monthly',
    QUARTERLY: 'quarterly'
};

export const getGroupStatusValues = () => Object.values(GROUP_STATUS);
export const getFrequencyTypeValues = () => Object.values(FREQUENCY_TYPE);