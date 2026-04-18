import { body, param, query } from 'express-validator';

export const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').matches(/^[0-9]{10}$/).withMessage('Phone must be 10 digits'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['super_admin', 'staff', 'politician']).withMessage('Invalid role'),
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
  body('partNumber').isInt({ min: 1 }).withMessage('Part number must be a positive integer'),
  body('name').trim().notEmpty().withMessage('Booth name is required'),
  body('assemblyConstituency').trim().notEmpty().withMessage('Assembly constituency is required'),
  body('district').trim().notEmpty().withMessage('District is required'),
];

export const voterAssignmentValidation = [
  body('staffId').notEmpty().withMessage('Staff ID is required'),
  body('boothId').notEmpty().withMessage('Booth ID is required'),
  body('voterSerialFrom').optional().isInt({ min: 1 }),
  body('voterSerialTo').optional().isInt({ min: 1 }),
];

export const voterUpdateValidation = [
  body('mobileNumber').optional().matches(/^[0-9]{10}$/).withMessage('Mobile must be 10 digits'),
  body('whatsappNumber').optional().matches(/^[0-9]{10}$/).withMessage('WhatsApp must be 10 digits'),
  body('email').optional().isEmail().withMessage('Valid email required'),
  body('gender').optional().isIn(['M', 'F', 'T']),
];

export const subscriptionValidation = [
  body('tier').isIn(['basic', 'standard', 'premium']).withMessage('Invalid tier'),
  body('assemblyConstituency').trim().notEmpty().withMessage('Assembly constituency is required'),
];

export const notificationValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('message').trim().notEmpty().withMessage('Message is required'),
  body('type').isIn(['system', 'assignment', 'subscription', 'urgent']).withMessage('Invalid type'),
];

export const mongoIdParam = [
  param('id').isMongoId().withMessage('Invalid ID format'),
];

export const paginationQuery = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
];
