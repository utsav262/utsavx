import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Event from '../models/Event.js';
import EventImage from '../models/EventImage.js';
import EventCategory from '../models/EventCategory.js';
import EventCity from '../models/EventCity.js';
import GlobalSetting from '../models/GlobalSetting.js';
import { env } from '../config/env.js';

const DEMO_PASSWORD = 'password123';

const demoUsers = [
    { name: 'Ananya Sharma', email: 'emma@utsavx.com', role: 'customer' },
    { name: 'Rohan Mehta', email: 'leo@utsavx.com', role: 'organizer' },
    { name: 'UTSAVX Admin', email: 'admin@utsavx.com', role: 'admin' }
];

const demoEvents = [
    {
        slug: 'diwali-night-bazaar',
        title: 'Diwali Night Bazaar',
        category: 'Food & Drink',
        city: 'Delhi',
        venueName: 'Connaught Place',
        startsAt: '2026-10-18T12:30:00.000Z',
        price: 499,
        quantity: 240,
        featured: true,
        imageUrl: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=1200&q=85',
        description: 'Street food, crafts, and live folk sets under a canopy of diyas across Connaught Place.'
    },
    {
        slug: 'monsoon-melody-fest',
        title: 'Monsoon Melody Fest',
        category: 'Music',
        city: 'Mumbai',
        venueName: 'Bandra Amphitheatre',
        startsAt: '2026-10-24T11:30:00.000Z',
        price: 1499,
        quantity: 80,
        featured: true,
        imageUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=85',
        description: 'Indie bands and monsoon vibes at an open-air amphitheatre by the sea.'
    },
    {
        slug: 'bangalore-maker-day',
        title: 'Bangalore Maker Day',
        category: 'Workshop',
        city: 'Bengaluru',
        venueName: 'Indiranagar Maker Hub',
        startsAt: '2026-11-01T04:30:00.000Z',
        price: 799,
        quantity: 120,
        featured: true,
        imageUrl: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=1200&q=85',
        description: 'Hands-on sessions for print, ceramics, and indie product design with local makers.'
    },
    {
        slug: 'jaipur-sunrise-run',
        title: 'Jaipur Sunrise Run',
        category: 'Wellness',
        city: 'Jaipur',
        venueName: 'Amer Road Trail',
        startsAt: '2026-11-08T00:30:00.000Z',
        price: 399,
        quantity: 300,
        featured: true,
        imageUrl: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1200&q=85',
        description: 'A scenic 5K past the pink city walls, ending with chai and a community stretch.'
    }
];

const demoCategories = [
    { name: 'Music', slug: 'music' },
    { name: 'Food & Drink', slug: 'food-drink' },
    { name: 'Workshop', slug: 'workshop' },
    { name: 'Wellness', slug: 'wellness' },
    { name: 'Conference', slug: 'conference' }
];

const demoCities = [
    { country: 'India', name: 'Delhi' },
    { country: 'India', name: 'Mumbai' },
    { country: 'India', name: 'Bengaluru' },
    { country: 'India', name: 'Jaipur' },
    { country: 'India', name: 'Hyderabad' },
    { country: 'India', name: 'Chennai' },
    { country: 'India', name: 'Kolkata' },
    { country: 'India', name: 'Pune' }
];

async function ensureReferenceData() {
    for (const category of demoCategories) {
        await EventCategory.updateOne({ slug: category.slug }, { $set: { ...category, status: 1 } }, { upsert: true });
    }
    for (const city of demoCities) {
        await EventCity.updateOne({ country: city.country, name: city.name }, { $set: { ...city, status: 1 } }, { upsert: true });
    }
    await GlobalSetting.updateOne(
        { country_id: 1 },
        {
            $set: {
                type: 'country',
                country_id: 1,
                country: 'India',
                currency: 'INR',
                Online_Payment_Fee_percentage: 2,
                Online_Payment_Fee_dollar_amount: 0,
                Online_Service_Fee_percentage: 5,
                Online_Service_Fee_dollar_amount: 0,
                payment_gateway: 'razorpay',
                timezone: JSON.stringify([
                    { label: 'India Standard Time', value: 'Asia/Kolkata' }
                ])
            }
        },
        { upsert: true }
    );
}

export async function ensureDemoUsers() {
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
    const users = {};
    for (const demo of demoUsers) {
        let user = await User.findOne({ email: demo.email });
        if (!user) {
            user = await User.create({ ...demo, passwordHash });
        } else {
            // Keep demo accounts aligned with README roles/passwords across re-seeds.
            user.name = demo.name;
            user.role = demo.role;
            user.passwordHash = passwordHash;
            await user.save();
        }
        users[demo.role === 'organizer' ? 'organizer' : demo.role] = user;
        if (demo.role === 'customer') users.customer = user;
    }
    return users;
}

export async function seedIfEmpty() {
    await ensureReferenceData();
    const users = await ensureDemoUsers();
    const count = await Event.countDocuments();
    if (count > 0) {
        console.log('Demo users ready (emma@utsavx.com, leo@utsavx.com, admin@utsavx.com / password123)');
        return users;
    }

    const created = await Event.insertMany(demoEvents.map((event) => ({
        organizer: users.organizer._id,
        title: event.title,
        slug: event.slug,
        description: event.description,
        category: event.category,
        venue: {
            name: event.venueName,
            city: event.city,
            country: 'India'
        },
        startsAt: event.startsAt,
        endsAt: event.startsAt,
        imageUrl: event.imageUrl,
        status: 'published',
        featured: event.featured,
        pageViews: 0,
        ticketTypes: [{
            name: 'General Admission',
            price: event.price,
            quantity: event.quantity,
            sold: 0,
            salesStatus: 'on-sale',
            currency: 'INR'
        }]
    })));

    await EventImage.insertMany(created.map((event, index) => ({
        event: event._id,
        url: demoEvents[index].imageUrl,
        type: 'cover',
        sortOrder: 0
    })));

    console.log('Seeded India demo events and users (emma@utsavx.com, leo@utsavx.com, admin@utsavx.com / password123)');
    return users;
}

async function run() {
    await mongoose.connect(env.mongoUri);
    await Event.deleteMany({});
    await EventImage.deleteMany({});
    await User.deleteMany({ email: { $in: demoUsers.map((user) => user.email) } });
    await seedIfEmpty();
    await mongoose.disconnect();
}

const isDirectRun = process.argv[1]?.includes('seed.js');
if (isDirectRun) {
    run().catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
