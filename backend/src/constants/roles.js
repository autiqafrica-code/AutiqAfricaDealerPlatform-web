'use strict'

const ROLES = Object.freeze({
  ENTERPRISE_ADMIN:    'ENTERPRISE_ADMIN',
  SUPPORT_ADMIN:       'SUPPORT_ADMIN',
  FRONT_DESK:          'FRONT_DESK',
  MANAGER:             'MANAGER',
  TECHNICIAN:          'TECHNICIAN',
  WORKSHOP_CONTROLLER: 'WORKSHOP_CONTROLLER',
  PARTS_INTERPRETER:   'PARTS_INTERPRETER',
  ACCOUNTS:            'ACCOUNTS',
  CEO:                 'CEO',
})

// Maps Prisma UserRole enum values to stable role codes
const USER_ROLE_TO_CODE = Object.freeze({
  Technician:         ROLES.TECHNICIAN,
  WorkshopController: ROLES.WORKSHOP_CONTROLLER,
  Accounts:           ROLES.ACCOUNTS,
  FrontDesk:          ROLES.FRONT_DESK,
  Manager:            ROLES.MANAGER,
  PartsInterpreter:   ROLES.PARTS_INTERPRETER,
  CEO:                ROLES.CEO,
})

// Maps EnterpriseAdmin.role string to stable role codes
const ADMIN_ROLE_TO_CODE = Object.freeze({
  'Enterprise Admin': ROLES.ENTERPRISE_ADMIN,
  'Support Admin':    ROLES.SUPPORT_ADMIN,
})

// Human-readable display names keyed by role code
const ROLE_DISPLAY = Object.freeze({
  ENTERPRISE_ADMIN:    'Enterprise Admin',
  SUPPORT_ADMIN:       'Support Admin',
  FRONT_DESK:          'Front Desk',
  MANAGER:             'Manager',
  TECHNICIAN:          'Technician',
  WORKSHOP_CONTROLLER: 'Workshop Controller',
  PARTS_INTERPRETER:   'Parts Interpreter',
  ACCOUNTS:            'Accounts',
  CEO:                 'CEO',
})

module.exports = { ROLES, USER_ROLE_TO_CODE, ADMIN_ROLE_TO_CODE, ROLE_DISPLAY }
