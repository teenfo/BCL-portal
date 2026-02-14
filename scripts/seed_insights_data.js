import { createClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables from .env.local
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
// For seeding, we might need service role key if RLS blocks inserts, 
// but let's try with anon key first assuming RLS allows insert or we use a service key manually if provided.
// Ideally, use SERVICE_ROLE_KEY for administrative seeding.
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seed() {
    console.log('🌱 Starting Data Seeding for Insights...');

    // 1. Fetch Basic Data (Facilities, Membership Plans, Coaches)
    const { data: facilities } = await supabase.from('facilities').select('id, name');
    const { data: plans } = await supabase.from('membership_plans').select('id, name, price');
    const { data: coaches } = await supabase.from('coaches').select('id, name');

    if (!facilities?.length || !plans?.length || !coaches?.length) {
        console.error('Facilities, Plans, or Coaches missing. Please seed basic data first.');
        return;
    }

    const facilityId = facilities[0].id;

    // 2. Generate Members (if few)
    console.log('Checking Members...');
    let { data: members } = await supabase.from('members').select('id');
    if (members.length < 50) {
        console.log('Generating more members...');
        const newMembers = [];
        for (let i = 0; i < 50; i++) {
            const sex = faker.person.sexType();
            const firstName = faker.person.firstName(sex);
            const lastName = faker.person.lastName();
            newMembers.push({
                name: `${firstName} ${lastName}`,
                email: faker.internet.email({ firstName, lastName }),
                phone: faker.phone.number('010-####-####'),
                gender: sex,
                birthdate: faker.date.birthdate({ min: 18, max: 60, mode: 'age' }),
                joined_date: faker.date.past({ years: 1 }),
                status: 'Active',
                plan: plans[Math.floor(Math.random() * plans.length)].name,
                credits: faker.number.int({ min: 0, max: 20 })
            });
        }
        const { data: createdMembers, error } = await supabase.from('members').insert(newMembers).select();
        if (error) console.error('Error creating members:', error);
        else members = [...members, ...createdMembers];
    }

    // 3. Generate Check-ins (Past 30 days)
    console.log('Generating Check-in History...');
    const checkins = [];
    const today = new Date();
    // Generate checkins for last 30 days
    for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);

        // Higher attendance on Mon/Tue/Wed
        const dayOfWeek = date.getDay();
        let dailyCount = faker.number.int({ min: 20, max: 40 });
        if (dayOfWeek === 0 || dayOfWeek === 6) dailyCount = Math.floor(dailyCount * 0.6); // Weekend less

        for (let j = 0; j < dailyCount; j++) {
            const member = members[Math.floor(Math.random() * members.length)];

            // Time distribution: Peak 18-21, Morning 07-09
            let hour;
            const r = Math.random();
            if (r < 0.6) hour = faker.number.int({ min: 18, max: 21 }); // 60% peak
            else if (r < 0.8) hour = faker.number.int({ min: 7, max: 9 }); // 20% morning
            else hour = faker.number.int({ min: 10, max: 17 }); // 20% day

            const checkinTime = new Date(date);
            checkinTime.setHours(hour, faker.number.int({ min: 0, max: 59 }), 0);

            checkins.push({
                member_id: member.id,
                member_name: member.name, // denormalized
                facility: facilities[0].name, // denormalized
                time: checkinTime.toISOString(),
                status: 'Present'
            });
        }
    }
    // Batch insert checkins
    const { error: checkinError } = await supabase.from('checkins').insert(checkins);
    if (checkinError) console.error('Checkin Insert Error:', checkinError);
    else console.log(`Created ${checkins.length} check-ins.`);


    // 4. Generate Sessions & Feedback
    console.log('Generating Sessions & Feedback...');
    const feedbackList = [];
    const sessionsList = [];

    for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);

        // 3-5 sessions per day
        const sessionCount = faker.number.int({ min: 3, max: 5 });
        for (let j = 0; j < sessionCount; j++) {
            const coach = coaches[Math.floor(Math.random() * coaches.length)];
            const startHour = [7, 12, 19, 20, 21][Math.floor(Math.random() * 5)];
            const startTime = new Date(date);
            startTime.setHours(startHour, 0, 0);
            const endTime = new Date(startTime);
            endTime.setHours(startHour + 1, 0, 0);

            // Create session first to get ID
            const { data: sessionData, error: sessionError } = await supabase.from('sessions').insert({
                title: `${['WOD', 'Strength', 'Gymnastics'][Math.floor(Math.random() * 3)]} Class`,
                coach_name: coach.name,
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                intensity: ['High', 'Medium', 'Low'][Math.floor(Math.random() * 3)],
                capacity: 20,
                enrolled: faker.number.int({ min: 5, max: 20 })
            }).select().single();

            if (sessionData) {
                // Generate Feedback for this session
                const feedbackCount = Math.floor(sessionData.enrolled * 0.4); // 40% response rate
                for (let k = 0; k < feedbackCount; k++) {
                    const member = members[Math.floor(Math.random() * members.length)];
                    feedbackList.push({
                        session_id: sessionData.id,
                        member_id: member.id,
                        rating: faker.number.int({ min: 3, max: 5 }), // skewed positive
                        comment: Math.random() > 0.7 ? faker.lorem.sentence() : null
                    });
                }
            }
        }
    }
    if (feedbackList.length > 0) {
        const { error: feedbackError } = await supabase.from('session_feedback').insert(feedbackList);
        if (feedbackError) console.error('Feedback Insert Error:', feedbackError);
        else console.log(`Created ${feedbackList.length} session feedbacks.`);
    }

    // 5. Generate Transactions
    console.log('Generating Transactions...');
    const transactions = [];
    for (let i = 0; i < 100; i++) {
        const date = faker.date.recent({ days: 30 });
        const plan = plans[Math.floor(Math.random() * plans.length)];
        const member = members[Math.floor(Math.random() * members.length)];

        transactions.push({
            id: `ord_${faker.string.nanoid(8)}`,
            member_id: member.id,
            member_email: member.email,
            amount: plan.price,
            status: 'completed',
            date: date.toISOString().split('T')[0],
            method: faker.helpers.arrayElement(['Card', 'Transfer', 'Cash']),
            category: faker.helpers.arrayElement(['Membership', 'PT', 'Goods', 'Membership']), // weighted roughly
            created_at: date.toISOString()
        });
    }
    const { error: transError } = await supabase.from('transactions').insert(transactions);
    if (transError) console.error('Transaction Insert Error:', transError);
    else console.log(`Created ${transactions.length} transactions.`);

    console.log('✅ Seeding Complete!');
}

seed();
