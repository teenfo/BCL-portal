import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
} catch (e) {
    console.warn('Could not load .env.local, using process.env');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// Use Service Role Key for Admin Seeding if available, else Anon Key
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedFoundations() {
    console.log('🏗️ Seeding Foundational Data...');

    // 1. Facilities
    console.log('Checking Facilities...');
    const { data: facilities } = await supabase.from('facilities').select('id');
    if (!facilities || facilities.length === 0) {
        console.log('Creating Main Facility...');
        await supabase.from('facilities').insert({
            name: 'BCL Main Center',
            address: 'Seoul, Gangnam-gu, Teheran-ro 123',
            operating_hours: '06:00 - 23:00'
        });
    }

    // 2. Membership Plans
    console.log('Checking Membership Plans...');
    const { data: plans } = await supabase.from('membership_plans').select('id');
    if (!plans || plans.length === 0) {
        console.log('Creating Membership Plans...');
        await supabase.from('membership_plans').insert([
            { name: '1 Month Unlimited', price: 150000, duration_days: 30, description: 'Unlimited access for 30 days' },
            { name: '3 Months Unlimited', price: 400000, duration_days: 90, description: 'Unlimited access for 90 days' },
            { name: '10 Sessions Pack', price: 200000, credits: 10, description: 'Good for 6 months', duration_days: 180 },
            { name: 'Drop-in', price: 25000, credits: 1, duration_days: 1, description: 'Single session pass' }
        ]);
    }

    // 3. Coaches
    console.log('Checking Coaches...');
    const { data: coaches } = await supabase.from('coaches').select('id');
    if (!coaches || coaches.length === 0) {
        console.log('Creating Coaches...');
        await supabase.from('coaches').insert([
            { name: 'James Wilson', email: 'james@bcl.com', specialty: 'CrossFit L2' },
            { name: 'Sarah Kim', email: 'sarah@bcl.com', specialty: 'Gymnastics' },
            { name: 'Michael Lee', email: 'mike@bcl.com', specialty: 'Weightlifting' },
            { name: 'Emma Davis', email: 'emma@bcl.com', specialty: 'Endurance' }
        ]);
    }

    console.log('✅ Foundation Seeding Complete!');
}

seedFoundations();
