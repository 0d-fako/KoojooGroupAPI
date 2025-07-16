const GROUP_STATUS = {
    PENDING_ACTIVATION: 'pending_activation',
    ACTIVE: 'active',
    PAUSED: 'paused',
    COMPLETED: 'completed',
    CLOSED: 'closed',
    CANCELLED: 'cancelled'
};

const FREQUENCY_TYPE = {
    
    DAILY: 'daily',
    WEEKLY: 'weekly',
    BI_WEEKLY: 'bi_weekly',
    MONTHLY: 'monthly',
    QUARTERLY: 'quarterly'
};

const MEMBER_ROLE = {
    TREASURER: 'treasurer',
    MEMBER: 'member',
    ADMIN: 'admin'
};

const PAYMENT_STATUS = {
    PENDING: 'pending',
    COMPLETED: 'completed',
    FAILED: 'failed',
    REFUNDED: 'refunded'
};

const TRANSACTION_TYPE = {
    CONTRIBUTION: 'contribution',
    PAYOUT: 'payout',
    PENALTY: 'penalty',
    REFUND: 'refund'
};

const INVITE_STATUS = {
    PENDING: 'pending',
    USED: 'used',
    EXPIRED: 'expired',
    CANCELLED: 'cancelled'
};

const getGroupStatusValues = () => Object.values(GROUP_STATUS);
const getFrequencyTypeValues = () => Object.values(FREQUENCY_TYPE);
const getMemberRoleValues = () => Object.values(MEMBER_ROLE);
const getPaymentStatusValues = () => Object.values(PAYMENT_STATUS);
const getTransactionTypeValues = () => Object.values(TRANSACTION_TYPE);
const getInviteStatusValues = () => Object.values(INVITE_STATUS);

module.exports = {
    GROUP_STATUS,
    FREQUENCY_TYPE,
    MEMBER_ROLE,
    PAYMENT_STATUS,
    TRANSACTION_TYPE,
    INVITE_STATUS,
    getGroupStatusValues,
    getFrequencyTypeValues,
    getMemberRoleValues,
    getPaymentStatusValues,
    getTransactionTypeValues,
    getInviteStatusValues
};