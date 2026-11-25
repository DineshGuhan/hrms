import type { MigrationBuilder } from 'node-pg-migrate';

/** HRM-16: department names must be unique (FR-DEP-01). */
exports.up = (pgm: MigrationBuilder): void => {
  pgm.createIndex('departments', 'name', { unique: true, name: 'departments_name_key' });
};

exports.down = (pgm: MigrationBuilder): void => {
  pgm.dropIndex('departments', 'departments_name_key', { ifExists: true });
};
