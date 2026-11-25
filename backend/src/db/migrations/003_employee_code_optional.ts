import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * HRM-10 follow-up: employee_code is not part of the API contract (HRM-10's
 * schema has no code field), so it cannot be NOT NULL. Drop the constraint;
 * an HR-assigned code can be added in a later story if needed.
 */
exports.up = (pgm: MigrationBuilder): void => {
  pgm.alterColumn('employees', 'employee_code', { notNull: false });
};

exports.down = (pgm: MigrationBuilder): void => {
  // Only reversible when no nulls exist.
  pgm.sql(`DELETE FROM employees WHERE employee_code IS NULL`);
  pgm.alterColumn('employees', 'employee_code', { notNull: true });
};
