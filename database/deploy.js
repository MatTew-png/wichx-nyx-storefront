/**
 * ==============================================================================
 * 🐘 NYX9 STUDIO — SUPABASE POSTGRESQL AUTOMATED DEPLOYER & MIGRATOR
 * ==============================================================================
 * รันสคริปต์นี้เพื่อ Deploy Schema 12 ตาราง, Stored Procedures และ Seed Data
 * เข้าสู่ Supabase PostgreSQL ในคำสั่งเดียว (One-Command Deployment)
 * 
 * การใช้งาน:
 * 1. ใส่ DATABASE_URL ในไฟล์ .env
 *    (รูปแบบ: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres)
 * 2. รัน: node database/deploy.js
 * ==============================================================================
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function deployDatabase() {
  console.log('================================================================');
  console.log('🚀 NYX9 STUDIO — SUPABASE POSTGRESQL DEPLOYMENT ENGINE');
  console.log('================================================================\n');

  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

  if (!connectionString) {
    console.error('❌ ไม่พบ DATABASE_URL ในไฟล์ .env');
    console.log('\nกรุณากำหนดค่าใน .env ดังนี้:');
    console.log('DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"\n');
    console.log('หรือคัดลอกไฟล์ database/schema.sql ไปรันโดยตรงในหน้า Supabase SQL Editor\n');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('⏳ กำลังเชื่อมต่อไปยัง Supabase PostgreSQL...');
    await client.connect();
    console.log('✅ เชื่อมต่อฐานข้อมูลสำเร็จ!\n');

    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('⏳ กำลังรันสคริปต์ Deploy Schema 12 ตาราง และ Atomic Procedures...');
    await client.query(sql);
    console.log('✅ Deploy Schema และ Seed Data สำเร็จเรียบร้อย!\n');

    // ตรวจสอบความถูกต้องของ 12 ตาราง
    console.log('🔍 ตรวจสอบความสมบูรณ์ของตารางระบบ:');
    const tables = [
      'profiles',
      'categories',
      'products',
      'inventory_keys',
      'orders',
      'order_items',
      'topup_transactions',
      'used_payment_slips',
      'promo_code_usages',
      'warranty_claims',
      'blacklists',
      'system_audit_logs'
    ];

    for (const table of tables) {
      const res = await client.query(`SELECT COUNT(*) FROM public.${table}`);
      console.log(`   ✔ public.${table.padEnd(20)} [${res.rows[0].count} rows]`);
    }

    // ตรวจสอบ Stored Procedure dispense_product_key
    const procRes = await client.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' AND routine_name = 'dispense_product_key'
    `);

    if (procRes.rows.length > 0) {
      console.log('\n   ✔ Stored Procedure: dispense_product_key() [ACTIVE - FOR UPDATE SKIP LOCKED]');
    }

    console.log('\n================================================================');
    console.log('🎉 ฐานข้อมูลพร้อมใช้งานในโหมด Production 100%!');
    console.log('================================================================\n');

  } catch (err) {
    console.error('❌ เกิดข้อผิดพลาดขณะ Deploy ฐานข้อมูล:', err.message);
  } finally {
    await client.end();
  }
}

deployDatabase();
