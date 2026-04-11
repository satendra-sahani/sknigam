import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import User from './models/User';
import Booth from './models/Booth';
import BoothAssignment from './models/BoothAssignment';

async function seed() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/election_management';
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Booth.deleteMany({}),
      BoothAssignment.deleteMany({}),
    ]);
    console.log('Cleared existing data');

    // Create Super Admin
    const superAdmin = await User.create({
      name: 'Super Admin',
      email: 'admin@election.com',
      phone: '9000000001',
      hashedPassword: 'Admin@123',
      role: 'super_admin',
      otpRequired: true,
      isVerified: true,
      isActive: true,
      trainingCompleted: true,
    });
    console.log('Created Super Admin: admin@election.com / Admin@123');

    // Create Zone In-charges
    const zoneIncharge1 = await User.create({
      name: 'Rajesh Kumar',
      email: 'rajesh@election.com',
      phone: '9000000002',
      hashedPassword: 'Zone@123',
      role: 'zone_incharge',
      zone: 'Zone-A',
      otpRequired: true,
      isVerified: true,
      isActive: true,
      trainingCompleted: true,
    });

    const zoneIncharge2 = await User.create({
      name: 'Priya Sharma',
      email: 'priya@election.com',
      phone: '9000000003',
      hashedPassword: 'Zone@123',
      role: 'zone_incharge',
      zone: 'Zone-B',
      otpRequired: true,
      isVerified: true,
      isActive: true,
      trainingCompleted: true,
    });
    console.log('Created 2 Zone In-charges');

    // Create Booth Supervisors
    const supervisors = [];
    const supervisorData = [
      { name: 'Amit Singh', email: 'amit@election.com', phone: '9000000004', zone: 'Zone-A' },
      { name: 'Neha Patel', email: 'neha@election.com', phone: '9000000005', zone: 'Zone-A' },
      { name: 'Vikram Reddy', email: 'vikram@election.com', phone: '9000000006', zone: 'Zone-A' },
      { name: 'Sunita Devi', email: 'sunita@election.com', phone: '9000000007', zone: 'Zone-B' },
      { name: 'Manoj Tiwari', email: 'manoj@election.com', phone: '9000000008', zone: 'Zone-B' },
    ];

    for (const data of supervisorData) {
      const supervisor = await User.create({
        ...data,
        hashedPassword: 'Staff@123',
        role: 'booth_supervisor',
        otpRequired: false,
        isVerified: true,
        isActive: true,
        trainingCompleted: true,
      });
      supervisors.push(supervisor);
    }
    console.log('Created 5 Booth Supervisors');

    // Create 10 Booths across 2 zones
    const booths = [];
    const boothData = [
      { name: 'Government Primary School', partNumber: 101, zone: 'Zone-A', village: 'Rampur', totalRegisteredVoters: 850, latitude: 28.6139, longitude: 77.2090 },
      { name: 'Community Hall Sector-5', partNumber: 102, zone: 'Zone-A', village: 'Rampur', totalRegisteredVoters: 1200, latitude: 28.6145, longitude: 77.2095 },
      { name: 'Panchayat Bhawan', partNumber: 103, zone: 'Zone-A', village: 'Shyampur', totalRegisteredVoters: 650, latitude: 28.6200, longitude: 77.2150 },
      { name: 'Municipal Ward Office', partNumber: 104, zone: 'Zone-A', village: 'Shyampur', totalRegisteredVoters: 920, latitude: 28.6210, longitude: 77.2160 },
      { name: 'District Court Complex', partNumber: 105, zone: 'Zone-A', village: 'Mohanpur', totalRegisteredVoters: 1100, latitude: 28.6250, longitude: 77.2200 },
      { name: 'Public Library Hall', partNumber: 201, zone: 'Zone-B', village: 'Lakshmipur', totalRegisteredVoters: 780, latitude: 28.6300, longitude: 77.2300 },
      { name: 'Government High School', partNumber: 202, zone: 'Zone-B', village: 'Lakshmipur', totalRegisteredVoters: 950, latitude: 28.6310, longitude: 77.2310 },
      { name: 'Town Hall', partNumber: 203, zone: 'Zone-B', village: 'Krishnanagar', totalRegisteredVoters: 1050, latitude: 28.6350, longitude: 77.2350 },
      { name: 'Sports Complex', partNumber: 204, zone: 'Zone-B', village: 'Krishnanagar', totalRegisteredVoters: 700, latitude: 28.6360, longitude: 77.2360 },
      { name: 'Cultural Center', partNumber: 205, zone: 'Zone-B', village: 'Govindpur', totalRegisteredVoters: 880, latitude: 28.6400, longitude: 77.2400 },
    ];

    for (const data of boothData) {
      const booth = await Booth.create({
        ...data,
        address: `${data.name}, ${data.village}`,
        facilities: {
          power: true,
          water: Math.random() > 0.3,
          shade: Math.random() > 0.2,
          accessibilityRamp: Math.random() > 0.5,
        },
      });
      booths.push(booth);
    }
    console.log('Created 10 Booths');

    // Create Booth Assignments
    // Zone-A supervisors -> Zone-A booths
    const zoneABooths = booths.filter((b) => b.zone === 'Zone-A');
    const zoneASupervisors = supervisors.filter((s) => s.zone === 'Zone-A');
    const zoneBBooths = booths.filter((b) => b.zone === 'Zone-B');
    const zoneBSupervisors = supervisors.filter((s) => s.zone === 'Zone-B');

    for (let i = 0; i < zoneABooths.length; i++) {
      const supervisor = zoneASupervisors[i % zoneASupervisors.length];
      await BoothAssignment.create({
        boothId: zoneABooths[i]._id,
        staffId: supervisor._id,
        type: 'primary',
        assignedBy: zoneIncharge1._id,
        isActive: true,
      });
    }

    for (let i = 0; i < zoneBBooths.length; i++) {
      const supervisor = zoneBSupervisors[i % zoneBSupervisors.length];
      await BoothAssignment.create({
        boothId: zoneBBooths[i]._id,
        staffId: supervisor._id,
        type: 'primary',
        assignedBy: zoneIncharge2._id,
        isActive: true,
      });
    }
    console.log('Created Booth Assignments');

    console.log('\n--- Seed Complete ---');
    console.log('Login credentials:');
    console.log('  Super Admin: admin@election.com / Admin@123 (requires OTP - check console)');
    console.log('  Zone In-charge A: rajesh@election.com / Zone@123 (requires OTP)');
    console.log('  Zone In-charge B: priya@election.com / Zone@123 (requires OTP)');
    console.log('  Booth Supervisors: amit@election.com / Staff@123 (no OTP)');
    console.log('                     neha@election.com / Staff@123');
    console.log('                     vikram@election.com / Staff@123');
    console.log('                     sunita@election.com / Staff@123');
    console.log('                     manoj@election.com / Staff@123');

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
