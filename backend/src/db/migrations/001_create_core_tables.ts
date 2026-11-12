import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * HRMS core schema — all 19 BRD entities (BRD §7.1).
 * Conventions: snake_case, uuid PKs, created_at/updated_at timestamps, soft deletes via status.
 */
exports.up = (pgm: MigrationBuilder): void => {
  // ── Identity & access ─────────────────────────────────────────────
  pgm.createTable(
    'roles',
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      name: { type: 'varchar(50)', notNull: true, unique: true },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    },
    { comment: 'RBAC roles: admin, hr, manager, employee' },
  );

  pgm.createTable(
    'users',
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      email: { type: 'varchar(255)', notNull: true, unique: true },
      password_hash: { type: 'varchar(255)' },
      email_verified_at: { type: 'timestamptz' },
      is_active: { type: 'boolean', notNull: true, default: true },
      failed_login_attempts: { type: 'integer', notNull: true, default: 0 },
      locked_until: { type: 'timestamptz' },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
      updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    },
    { comment: 'Login accounts (FR-AUTH)' },
  );

  pgm.createTable(
    'user_roles',
    {
      user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
      role_id: { type: 'uuid', notNull: true, references: 'roles', onDelete: 'CASCADE' },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    },
    { comment: 'User↔role assignments (RBAC)' },
  );
  pgm.addConstraint('user_roles', 'user_roles_pk', 'PRIMARY KEY (user_id, role_id)');

  pgm.createTable(
    'refresh_tokens',
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
      token_hash: { type: 'varchar(255)', notNull: true },
      expires_at: { type: 'timestamptz', notNull: true },
      revoked_at: { type: 'timestamptz' },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    },
    { comment: 'Refresh tokens, hashed; rotated on each use (FR-AUTH-04)' },
  );
  pgm.createIndex('refresh_tokens', 'user_id');

  pgm.createTable(
    'invitations',
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      email: { type: 'varchar(255)', notNull: true },
      token_hash: { type: 'varchar(255)', notNull: true },
      role_id: { type: 'uuid', references: 'roles' },
      department_id: { type: 'uuid' },
      invited_by: { type: 'uuid', notNull: true },
      expires_at: { type: 'timestamptz', notNull: true },
      accepted_at: { type: 'timestamptz' },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    },
    { comment: 'Employee onboarding invitations (FR-AUTH-09)' },
  );

  // ── Org structure ─────────────────────────────────────────────────
  pgm.createTable(
    'departments',
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      name: { type: 'varchar(100)', notNull: true },
      description: { type: 'text' },
      parent_id: { type: 'uuid' },
      head_employee_id: { type: 'uuid' },
      status: { type: 'varchar(20)', notNull: true, default: 'active' },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
      updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    },
    { comment: 'Departments, optionally nested (FR-DEP)' },
  );
  pgm.addConstraint(
    'departments',
    'departments_parent_fk',
    'FOREIGN KEY (parent_id) REFERENCES departments (id)',
  );

  pgm.createTable(
    'employees',
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
      department_id: { type: 'uuid', references: 'departments' },
      manager_id: { type: 'uuid' },
      employee_code: { type: 'varchar(20)', notNull: true, unique: true },
      first_name: { type: 'varchar(100)', notNull: true },
      last_name: { type: 'varchar(100)', notNull: true },
      date_of_birth: { type: 'date' },
      phone: { type: 'varchar(30)' },
      address: { type: 'text' },
      job_title: { type: 'varchar(100)' },
      join_date: { type: 'date' },
      employment_status: { type: 'varchar(20)', notNull: true, default: 'active' },
      national_id_encrypted: { type: 'bytea' },
      salary_encrypted: { type: 'bytea' },
      bank_details_encrypted: { type: 'bytea' },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
      updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    },
    { comment: 'Employee records; salary/bank/NID encrypted at rest (FR-EMP-05)' },
  );
  pgm.addConstraint(
    'employees',
    'employees_manager_fk',
    'FOREIGN KEY (manager_id) REFERENCES employees (id)',
  );
  pgm.addConstraint(
    'employees',
    'employees_department_fk',
    'FOREIGN KEY (department_id) REFERENCES departments (id)',
  );
  pgm.createIndex('employees', 'department_id');
  pgm.createIndex('employees', 'manager_id');

  // ── Leave ─────────────────────────────────────────────────────────
  pgm.createTable(
    'leave_types',
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      name: { type: 'varchar(100)', notNull: true, unique: true },
      quota_days: { type: 'numeric(5, 1)', notNull: true },
      is_paid: { type: 'boolean', notNull: true, default: true },
      is_active: { type: 'boolean', notNull: true, default: true },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    },
    { comment: 'Leave types with yearly quotas (FR-LEV-01)' },
  );

  pgm.createTable(
    'leave_balances',
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      employee_id: { type: 'uuid', notNull: true, references: 'employees', onDelete: 'CASCADE' },
      leave_type_id: { type: 'uuid', notNull: true, references: 'leave_types', onDelete: 'CASCADE' },
      year: { type: 'integer', notNull: true },
      quota_days: { type: 'numeric(5, 1)', notNull: true },
      used_days: { type: 'numeric(5, 1)', notNull: true, default: 0 },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
      updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    },
    { comment: 'Per-employee leave balance per type per year (FR-LEV-06)' },
  );
  pgm.addConstraint(
    'leave_balances',
    'leave_balances_unique',
    'UNIQUE (employee_id, leave_type_id, year)',
  );

  pgm.createTable(
    'leave_requests',
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      employee_id: { type: 'uuid', notNull: true, references: 'employees', onDelete: 'CASCADE' },
      leave_type_id: { type: 'uuid', notNull: true, references: 'leave_types' },
      start_date: { type: 'date', notNull: true },
      end_date: { type: 'date', notNull: true },
      reason: { type: 'text' },
      status: { type: 'varchar(20)', notNull: true, default: 'pending' },
      approver_id: { type: 'uuid', references: 'employees' },
      decided_at: { type: 'timestamptz' },
      decision_comment: { type: 'text' },
      cancelled_at: { type: 'timestamptz' },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
      updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    },
    { comment: 'Leave requests; status pending/approved/rejected/cancelled (FR-LEV)' },
  );
  pgm.createIndex('leave_requests', 'employee_id');
  pgm.createIndex('leave_requests', ['employee_id', 'start_date', 'end_date']);

  // ── Attendance ────────────────────────────────────────────────────
  pgm.createTable(
    'attendance_records',
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      employee_id: { type: 'uuid', notNull: true, references: 'employees', onDelete: 'CASCADE' },
      work_date: { type: 'date', notNull: true },
      check_in_at: { type: 'timestamptz' },
      check_out_at: { type: 'timestamptz' },
      worked_hours: { type: 'numeric(4, 2)' },
      is_corrected: { type: 'boolean', notNull: true, default: false },
      corrected_by: { type: 'uuid' },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
      updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    },
    { comment: 'Check-in/out records; HR corrections audited (FR-ATT)' },
  );
  pgm.addConstraint(
    'attendance_records',
    'attendance_unique_day',
    'UNIQUE (employee_id, work_date)',
  );

  // ── Payroll ───────────────────────────────────────────────────────
  pgm.createTable(
    'payroll_runs',
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      period_month: { type: 'date', notNull: true },
      status: { type: 'varchar(20)', notNull: true, default: 'draft' },
      run_by: { type: 'uuid', notNull: true },
      locked_at: { type: 'timestamptz' },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    },
    { comment: 'Monthly payroll runs; lockable (FR-PAY-06)' },
  );
  pgm.addConstraint(
    'payroll_runs',
    'payroll_runs_unique_period',
    'UNIQUE (period_month)',
  );

  pgm.createTable(
    'payslips',
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      payroll_run_id: { type: 'uuid', notNull: true, references: 'payroll_runs', onDelete: 'CASCADE' },
      employee_id: { type: 'uuid', notNull: true, references: 'employees', onDelete: 'CASCADE' },
      gross_pay: { type: 'numeric(12, 2)', notNull: true },
      deductions: { type: 'numeric(12, 2)', notNull: true, default: 0 },
      tax: { type: 'numeric(12, 2)', notNull: true, default: 0 },
      net_pay: { type: 'numeric(12, 2)', notNull: true },
      unpaid_leave_days: { type: 'numeric(5, 1)', notNull: true, default: 0 },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    },
    { comment: 'Per-employee payslip for a payroll run (FR-PAY)' },
  );
  pgm.addConstraint(
    'payslips',
    'payslips_unique',
    'UNIQUE (payroll_run_id, employee_id)',
  );

  // ── Performance ───────────────────────────────────────────────────
  pgm.createTable(
    'performance_cycles',
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      name: { type: 'varchar(100)', notNull: true },
      period_start: { type: 'date', notNull: true },
      period_end: { type: 'date', notNull: true },
      status: { type: 'varchar(20)', notNull: true, default: 'active' },
      created_by: { type: 'uuid', notNull: true },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    },
    { comment: 'Review cycles (FR-PER-01)' },
  );

  pgm.createTable(
    'performance_reviews',
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      cycle_id: { type: 'uuid', notNull: true, references: 'performance_cycles', onDelete: 'CASCADE' },
      employee_id: { type: 'uuid', notNull: true, references: 'employees', onDelete: 'CASCADE' },
      reviewer_id: { type: 'uuid', notNull: true, references: 'employees' },
      rating: { type: 'numeric(3, 1)' },
      comments: { type: 'text' },
      status: { type: 'varchar(20)', notNull: true, default: 'pending' },
      acknowledged_at: { type: 'timestamptz' },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
      updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    },
    { comment: 'Reviews visible to employee, manager, HR (FR-PER-04)' },
  );
  pgm.addConstraint(
    'performance_reviews',
    'reviews_unique',
    'UNIQUE (cycle_id, employee_id)',
  );

  // ── Documents ─────────────────────────────────────────────────────
  pgm.createTable(
    'documents',
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      title: { type: 'varchar(200)', notNull: true },
      file_name: { type: 'varchar(255)', notNull: true },
      file_size: { type: 'integer', notNull: true },
      mime_type: { type: 'varchar(100)', notNull: true },
      storage_path: { type: 'varchar(500)', notNull: true },
      uploaded_by: { type: 'uuid', notNull: true },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    },
    { comment: 'Documents & policies (FR-DOC)' },
  );

  pgm.createTable(
    'document_recipients',
    {
      document_id: { type: 'uuid', notNull: true, references: 'documents', onDelete: 'CASCADE' },
      employee_id: { type: 'uuid', notNull: true, references: 'employees', onDelete: 'CASCADE' },
      acknowledged_at: { type: 'timestamptz' },
    },
    { comment: 'Document targeting + acknowledgement tracking (FR-DOC-02/04)' },
  );
  pgm.addConstraint(
    'document_recipients',
    'document_recipients_pk',
    'PRIMARY KEY (document_id, employee_id)',
  );

  // ── Notifications & audit ─────────────────────────────────────────
  pgm.createTable(
    'notifications',
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
      type: { type: 'varchar(50)', notNull: true },
      payload: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
      read_at: { type: 'timestamptz' },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    },
    { comment: 'In-app notifications (FR-NOT)' },
  );
  pgm.createIndex('notifications', 'user_id');

  pgm.createTable(
    'audit_logs',
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      actor_id: { type: 'uuid', notNull: true },
      action: { type: 'varchar(100)', notNull: true },
      entity_type: { type: 'varchar(50)', notNull: true },
      entity_id: { type: 'uuid' },
      before: { type: 'jsonb' },
      after: { type: 'jsonb' },
      ip_address: { type: 'varchar(45)' },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    },
    { comment: 'Immutable audit log; no update/delete via app (FR-AUD)' },
  );
  pgm.createIndex('audit_logs', 'entity_type');
  pgm.createIndex('audit_logs', 'created_at');
};

exports.down = (pgm: MigrationBuilder): void => {
  pgm.dropTable('audit_logs', { ifExists: true });
  pgm.dropTable('notifications', { ifExists: true });
  pgm.dropTable('document_recipients', { ifExists: true });
  pgm.dropTable('documents', { ifExists: true });
  pgm.dropTable('performance_reviews', { ifExists: true });
  pgm.dropTable('performance_cycles', { ifExists: true });
  pgm.dropTable('payslips', { ifExists: true });
  pgm.dropTable('payroll_runs', { ifExists: true });
  pgm.dropTable('attendance_records', { ifExists: true });
  pgm.dropTable('leave_requests', { ifExists: true });
  pgm.dropTable('leave_balances', { ifExists: true });
  pgm.dropTable('leave_types', { ifExists: true });
  pgm.dropTable('employees', { ifExists: true });
  pgm.dropTable('departments', { ifExists: true });
  pgm.dropTable('invitations', { ifExists: true });
  pgm.dropTable('refresh_tokens', { ifExists: true });
  pgm.dropTable('user_roles', { ifExists: true });
  pgm.dropTable('users', { ifExists: true });
  pgm.dropTable('roles', { ifExists: true });
};
