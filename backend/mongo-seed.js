// mongo-seed.js – Seed all 6 MongoDB collections with representative data
// Run: node mongo-seed.js
'use strict';

require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri    = process.env.MONGO_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGO_DB  || 'aeronetb_docs';

async function seed() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  console.log(`[Seed] Connected to ${dbName}`);

  // ─── Drop existing collections ──────────────────────────────────────────────
  const cols = ['qc_reports','component_certifications','iot_sensor_readings',
                'baseline_specifications','shipment_tracking','supplier_customizations'];
  for (const c of cols) {
    await db.collection(c).drop().catch(() => {});
  }

  // ─── 1. qc_reports ──────────────────────────────────────────────────────────
  await db.collection('qc_reports').insertMany([
    {
      report_id:       'RPT-2026-001',
      order_item_id:   1,
      inspector_id:    2,
      report_type:     'dimensional',
      inspection_date: new Date('2026-01-15T14:00:00Z'),
      overall_result:  'Pass',
      version:         1,
      is_immutable:    true,
      approved_by:     2,
      approved_at:     new Date('2026-01-16T09:00:00Z'),
      dimensional_checks: [
        { parameter:'Panel Length',   nominal:2400, measured:2400.2, tolerance:0.5, unit:'mm', result:'Pass' },
        { parameter:'Panel Width',    nominal:800,  measured:799.8,  tolerance:0.3, unit:'mm', result:'Pass' },
        { parameter:'Thickness',      nominal:3.2,  measured:3.21,   tolerance:0.05,unit:'mm', result:'Pass' }
      ],
      comments:    'All dimensions within tolerance. Surface finish acceptable.',
      attachments: [],
      created_at:  new Date('2026-01-15T14:00:00Z')
    },
    {
      report_id:       'RPT-2026-002',
      order_item_id:   3,
      inspector_id:    2,
      report_type:     'ndt',
      inspection_date: new Date('2026-01-20T10:30:00Z'),
      overall_result:  'Pass',
      version:         2,
      is_immutable:    false,
      ndt_results: [
        { method:'Ultrasonic Testing',  area_inspected:'Full panel face', finding:'No defects detected', severity:'None' },
        { method:'Dye Penetrant',       area_inspected:'All edges',       finding:'No cracks or porosity',severity:'None' }
      ],
      comments:    'NDT complete — no subsurface anomalies detected.',
      attachments: [],
      created_at:  new Date('2026-01-20T10:30:00Z')
    },
    {
      report_id:       'RPT-2026-003',
      order_item_id:   2,
      inspector_id:    2,
      report_type:     'environmental',
      inspection_date: new Date('2026-02-05T09:00:00Z'),
      overall_result:  'Fail',
      version:         1,
      is_immutable:    false,
      environmental_tests: [
        { test_type:'Salt Spray',       conditions:{ temp:35, humidity:95 }, duration_hours:500,  outcome:'Pass' },
        { test_type:'Thermal Cycling',  conditions:{ min_temp:-55, max_temp:85 }, cycles:100,     outcome:'Fail',
          note:'Micro-cracking detected at junction bracket after 82 cycles' }
      ],
      comments:    'Thermal cycling failure — sample returned to supplier for root cause analysis.',
      attachments: [],
      created_at:  new Date('2026-02-05T09:00:00Z')
    }
  ]);
  console.log('[Seed] qc_reports: 3 documents inserted');

  // ─── 2. component_certifications ────────────────────────────────────────────
  await db.collection('component_certifications').insertMany([
    {
      certification_id:  'CERT-2026-A320-001',
      part_id:           1,
      supplier_id:       1,
      inspector_id:      2,
      certification_date:new Date('2026-01-17T00:00:00Z'),
      expiry_date:       new Date('2028-01-17T00:00:00Z'),
      status:            'Active',
      is_immutable:      true,
      approved_by:       2,
      approved_at:       new Date('2026-01-17T11:30:00Z'),
      test_results: [
        { test_name:'Tensile Strength',   result:620,   unit:'MPa',  pass_criteria:'>580 MPa', status:'Pass' },
        { test_name:'Fatigue Life',       result:150000, unit:'cycles', pass_criteria:'>100000', status:'Pass' },
        { test_name:'Hardness (HRC)',     result:72,    unit:'HRC',  pass_criteria:'68-78 HRC', status:'Pass' }
      ],
      material_traceability: {
        batch_id:      'BATCH-TIT-2025-Q4-0012',
        raw_material:  '2024-T3 Aluminium-Lithium Alloy',
        origin_country:'France',
        smelter:       'Constellium Issoire'
      },
      created_at: new Date('2026-01-17T00:00:00Z')
    }
  ]);
  console.log('[Seed] component_certifications: 1 document inserted');

  // ─── 3. iot_sensor_readings (time-series) ───────────────────────────────────
  const iotDocs = [];
  const now = Date.now();
  for (let i = 0; i < 50; i++) {
    const offset   = i * 60000; // one reading per minute, going back 50 minutes
    const equipId  = (i % 5) + 1;   // cycle through equipment 1-5
    const temp     = +(70 + Math.random()*20).toFixed(1);
    const vibr     = +(1  + Math.random()*4).toFixed(2);
    const pres     = +(100 + Math.random()*60).toFixed(1);
    const alerts   = [];
    if (temp > 85)  alerts.push({ sensor:'temperature', value:temp,  threshold:85  });
    if (vibr > 5)   alerts.push({ sensor:'vibration',   value:vibr,  threshold:5   });
    if (pres > 150) alerts.push({ sensor:'pressure',    value:pres,  threshold:150 });
    iotDocs.push({
      equipment_id: equipId,
      timestamp:    new Date(now - offset),
      readings: { temperature:temp, vibration:vibr, pressure:pres, cycle_count: 10000 + i*3 },
      gps: { latitude: null, longitude: null },
      alerts
    });
  }
  await db.collection('iot_sensor_readings').insertMany(iotDocs);
  console.log('[Seed] iot_sensor_readings: 50 documents inserted');

  // ─── 4. baseline_specifications ────────────────────────────────────────────
  await db.collection('baseline_specifications').insertMany([
    {
      part_id: 1,
      mechanical_properties: {
        tensile_strength:   { value: 580, unit: 'MPa' },
        fatigue_limit:      { value: 200, unit: 'MPa' },
        yield_point:        { value: 490, unit: 'MPa' }
      },
      process_details: [
        { step_order:1, process_name:'Hot Rolling',           parameters:{ temp:'450°C', pass_count:6 },           duration_min:45 },
        { step_order:2, process_name:'Solution Heat Treatment',parameters:{ temp:'495°C', hold_time:'1hr' },        duration_min:75 },
        { step_order:3, process_name:'Quenching',              parameters:{ medium:'cold water', temp:'20°C' },     duration_min:5  },
        { step_order:4, process_name:'CNC Milling',            parameters:{ tolerance:'±0.1mm', tool:'carbide' },   duration_min:120},
        { step_order:5, process_name:'Surface Anodising',      parameters:{ type:'Type III', thickness:'25μm' },    duration_min:60 }
      ],
      cad_references: [
        { file_name:'A320-FUS-PNL-13-DWG-001.STEP', file_type:'STEP', version:'Rev C', uploaded_at: new Date('2025-06-01') }
      ],
      technical_notes: [
        { author:'Elena Christodoulou', date: new Date('2025-09-15'), note:'Supplier Titan uses 5% thicker substrate per deviation agreement DEV-2025-003.' }
      ],
      geometry_tolerance: 'Per ASME Y14.5-2018, flatness 0.2mm/m, perpendicularity 0.3mm',
      created_at: new Date('2025-03-01')
    },
    {
      part_id: 2,
      mechanical_properties: {
        tensile_strength: { value: 503, unit: 'MPa' },
        fatigue_limit:    { value: 160, unit: 'MPa' },
        yield_point:      { value: 435, unit: 'MPa' }
      },
      process_details: [
        { step_order:1, process_name:'Forging',       parameters:{ temp:'450°C', die:'D-737-UC' }, duration_min:30 },
        { step_order:2, process_name:'CNC Machining', parameters:{ tolerance:'±0.05mm' },           duration_min:180 },
        { step_order:3, process_name:'NDT Inspection',parameters:{ method:'UT + RT' },              duration_min:90 }
      ],
      cad_references: [
        { file_name:'B737-WNG-SPAR-UC-DWG-002.CATPART', file_type:'CATIA', version:'Rev A', uploaded_at: new Date('2024-11-15') }
      ],
      technical_notes: [],
      geometry_tolerance: 'Per BS EN ISO 2768-2, class H for all linear dimensions',
      created_at: new Date('2024-08-20')
    }
  ]);
  console.log('[Seed] baseline_specifications: 2 documents inserted');

  // ─── 5. shipment_tracking ────────────────────────────────────────────────────
  await db.collection('shipment_tracking').insertMany([
    {
      shipment_id:   1,
      latest_status: 'Delivered to Athens International Airport',
      latest_gps:    { lat: 37.9364, lng: 23.9475 },
      updates: [
        { timestamp: new Date('2025-12-10T08:00:00Z'), location:'Departed Toulouse Logistics Hub', gps:{lat:43.604,lng:1.444},  container_condition:'Intact', notes:'' },
        { timestamp: new Date('2025-12-11T14:00:00Z'), location:'Frankfurt Air Cargo Centre',       gps:{lat:50.033,lng:8.570},  container_condition:'Intact', notes:'Connecting flight delayed 2h' },
        { timestamp: new Date('2025-12-12T06:30:00Z'), location:'Departed Frankfurt',               gps:{lat:50.033,lng:8.570},  container_condition:'Intact', notes:'' },
        { timestamp: new Date('2026-01-14T11:00:00Z'), location:'Delivered to Athens International Airport', gps:{lat:37.936,lng:23.947}, container_condition:'Intact', notes:'Received and signed off by A.Papadaki' }
      ],
      updated_at: new Date('2026-01-14T11:00:00Z')
    },
    {
      shipment_id:   2,
      latest_status: 'In Transit — Suez Canal',
      latest_gps:    { lat: 30.573, lng: 32.265 },
      updates: [
        { timestamp: new Date('2026-01-08T06:00:00Z'), location:'Departed Hamburg Port',      gps:{lat:53.570,lng:9.967}, container_condition:'Intact', notes:'' },
        { timestamp: new Date('2026-01-15T09:00:00Z'), location:'Passed Gibraltar Strait',    gps:{lat:35.992,lng:-5.601},container_condition:'Intact', notes:'Temperature reading: 18°C — normal' },
        { timestamp: new Date('2026-01-22T12:00:00Z'), location:'In Transit — Suez Canal',    gps:{lat:30.573,lng:32.265},container_condition:'Intact', notes:'' }
      ],
      updated_at: new Date('2026-01-22T12:00:00Z')
    }
  ]);
  console.log('[Seed] shipment_tracking: 2 documents inserted');

  // ─── 6. supplier_customizations ─────────────────────────────────────────────
  await db.collection('supplier_customizations').insertMany([
    {
      supplier_part_id: 1,
      supplier_id:      1,
      part_id:          1,
      features: [
        {
          feature_name:   'Anti-Corrosion Coating',
          description:    'Chromate-free epoxy primer conforming to MIL-PRF-23377 applied by Titan per DEV-2025-003.',
          specifications: { coating_type:'Epoxy primer', thickness_um:25, adhesion:'Crosshatch Grade 0', standard:'MIL-PRF-23377' },
          attachments:    [{ filename:'coating_cert_batch_2025Q4.pdf', gridfs_id:'507f1f77bcf86cd799439011' }]
        },
        {
          feature_name:   'RFID Tracking Tag',
          description:    'Passive UHF RFID label embedded in packaging for real-time inventory tracking.',
          specifications: { standard:'EPC Gen2', frequency:'868 MHz', read_range_m:5 },
          attachments:    []
        }
      ],
      created_at: new Date('2025-11-01')
    }
  ]);
  console.log('[Seed] supplier_customizations: 1 document inserted');

  // ─── Create indexes ──────────────────────────────────────────────────────────
  await db.collection('qc_reports').createIndex({ report_id:1 }, { unique:true });
  await db.collection('qc_reports').createIndex({ order_item_id:1 });
  await db.collection('qc_reports').createIndex({ overall_result:1 });
  await db.collection('qc_reports').createIndex({ inspection_date:-1 });

  await db.collection('component_certifications').createIndex({ certification_id:1 }, { unique:true });
  await db.collection('component_certifications').createIndex({ part_id:1 });
  await db.collection('component_certifications').createIndex({ supplier_id:1 });

  await db.collection('iot_sensor_readings').createIndex({ equipment_id:1, timestamp:-1 });

  await db.collection('baseline_specifications').createIndex({ part_id:1 }, { unique:true });

  await db.collection('shipment_tracking').createIndex({ shipment_id:1 }, { unique:true });

  await db.collection('supplier_customizations').createIndex({ supplier_part_id:1 }, { unique:true });

  console.log('[Seed] All indexes created');
  await client.close();
  console.log('\n✅ MongoDB seed complete!');
}

seed().catch(err => { console.error('[Seed Error]', err); process.exit(1); });
