import { body, param, query } from 'express-validator';

export const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').matches(/^[0-9]{10}$/).withMessage('Phone must be 10 digits'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['super_admin', 'zone_incharge', 'booth_supervisor', 'data_entry_operator', 'observer'])
    .withMessage('Invalid role'),
];

export const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const otpValidation = [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('code').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
];

export const refreshTokenValidation = [
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
];

export const boothValidation = [
  body('name').trim().notEmpty().withMessage('Booth name is required'),
  body('partNumber').isInt({ min: 1 }).withMessage('Part number must be a positive integer'),
  body('zone').trim().notEmpty().withMessage('Zone is required'),
  body('totalRegisteredVoters').isInt({ min: 0 }).withMessage('Total registered voters must be non-negative'),
];

export const boothAssignmentValidation = [
  body('boothId').notEmpty().withMessage('Booth ID is required'),
  body('staffId').notEmpty().withMessage('Staff ID is required'),
  body('type').isIn(['primary', 'backup']).withMessage('Type must be primary or backup'),
];

export const voterCountValidation = [
  body('boothId').notEmpty().withMessage('Booth ID is required'),
  body('slot').isIn(['09:00', '11:00', '13:00', '15:00', '17:00']).withMessage('Invalid slot time'),
  body('electionDate').isISO8601().withMessage('Valid election date is required'),
  body('maleCount').isInt({ min: 0 }).withMessage('Male count must be non-negative'),
  body('femaleCount').isInt({ min: 0 }).withMessage('Female count must be non-negative'),
  body('otherCount').isInt({ min: 0 }).withMessage('Other count must be non-negative'),
];

export const checkInValidation = [
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
];

export const incidentValidation = [
  body('boothId').notEmpty().withMessage('Booth ID is required'),
  body('category').isIn(['technical', 'security', 'administrative', 'other']).withMessage('Invalid category'),
  body('severity').isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid severity'),
  body('description').trim().notEmpty().withMessage('Description is required'),
];

export const notificationValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('message').trim().notEmpty().withMessage('Message is required'),
  body('type').isIn(['system', 'zone_broadcast', 'report_update', 'incident_update', 'urgent'])
    .withMessage('Invalid notification type'),
];

export const staffSwapValidation = [
  body('currentStaffId').notEmpty().withMessage('Current staff ID is required'),
  body('replacementStaffId').notEmpty().withMessage('Replacement staff ID is required'),
  body('boothId').notEmpty().withMessage('Booth ID is required'),
  body('reason').trim().notEmpty().withMessage('Reason is required'),
];

export const mongoIdParam = [
  param('id').isMongoId().withMessage('Invalid ID format'),
];

export const paginationQuery = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
];
