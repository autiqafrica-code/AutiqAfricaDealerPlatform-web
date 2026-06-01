-- ============================================================
-- Migration 001: Create Database
-- Run this ONCE as a superuser BEFORE running 002_create_schema.sql
-- ============================================================

-- Connect to the default 'postgres' database before running this.
-- psql -U postgres -h localhost -p 5432 -f 001_create_database.sql

-- Create the application database
CREATE DATABASE autiq_africa_db
  WITH
  ENCODING = 'UTF8'
  OWNER = postgres;

-- Connect to the new database (run subsequent scripts against this DB)
-- \c autiq_africa_db
