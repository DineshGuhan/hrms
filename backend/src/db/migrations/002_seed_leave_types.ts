import type { MigrationBuilder } from 'node-pg-migrate';

/** Seed default leave types (FR-LEV-01: annual, sick, unpaid). */
exports.up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    INSERT INTO leave_types (name, quota_days, is_paid) VALUES
      ('Annual', 20.0, true),
      ('Sick', 10.0, true),
      ('Unpaid', 0.0, false)
    ON CONFLICT (name) DO NOTHING;
  `);
};

exports.down = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    DELETE FROM leave_types WHERE name IN ('Annual', 'Sick', 'Unpaid');
  `);
};
