import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import User from './models/User';
import Booth from './models/Booth';
import Voter from './models/Voter';
import VoterAssignment from './models/VoterAssignment';
import Subscription from './models/Subscription';

async function seed() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pollstics';
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB:', mongoURI);

    await Promise.all([
      User.deleteMany({}),
      Booth.deleteMany({}),
      Voter.deleteMany({}),
      VoterAssignment.deleteMany({}),
      Subscription.deleteMany({}),
    ]);
    console.log('Cleared existing data');

    // --- Super Admin ---
    const superAdmin = await User.create({
      name: 'POLLSTICS Admin',
      email: 'admin@pollstics.com',
      phone: '9000000001',
      hashedPassword: 'Admin@123',
      role: 'super_admin',
      otpRequired: false,
      isVerified: true,
      isActive: true,
    });
    console.log('Created Super Admin: admin@pollstics.com / Admin@123 (no OTP)');

    // --- Field Staff ---
    const staffData = [
      { name: 'Ramesh Kumar', email: 'ramesh@pollstics.com', phone: '9000000011', assemblyConstituency: 'Lucknow Cantt', district: 'Lucknow' },
      { name: 'Suresh Yadav', email: 'suresh@pollstics.com', phone: '9000000012', assemblyConstituency: 'Lucknow Cantt', district: 'Lucknow' },
      { name: 'Anita Devi', email: 'anita@pollstics.com', phone: '9000000013', assemblyConstituency: 'Lucknow North', district: 'Lucknow' },
    ];
    const staffUsers = [];
    for (const data of staffData) {
      const u = await User.create({
        ...data,
        hashedPassword: 'Staff@123',
        role: 'staff',
        otpRequired: true,
        isVerified: true,
        isActive: true,
      });
      staffUsers.push(u);
    }
    console.log(`Created ${staffUsers.length} field staff (password Staff@123, OTP required)`);

    // --- Politician ---
    const politician = await User.create({
      name: 'Rajiv Nath',
      email: 'rajiv@pollstics.com',
      phone: '9000000021',
      hashedPassword: 'Leader@123',
      role: 'politician',
      assemblyConstituency: 'Lucknow Cantt',
      district: 'Lucknow',
      partyAffiliation: 'Independent',
      otpRequired: true,
      isVerified: true,
      isActive: true,
    });
    console.log('Created Politician: rajiv@pollstics.com / Leader@123 (OTP required)');

    // --- Booths (POLLSTICS, Uttar Pradesh) ---
    const boothData = [
      { partNumber: 101, name: 'Government Primary School, Ashok Nagar', assemblyConstituency: 'Lucknow Cantt', district: 'Lucknow', village: 'Ashok Nagar', totalVoters: 850 },
      { partNumber: 102, name: 'Community Hall, Sector 5', assemblyConstituency: 'Lucknow Cantt', district: 'Lucknow', village: 'Sector 5', totalVoters: 1200 },
      { partNumber: 103, name: 'Panchayat Bhawan, Rampur', assemblyConstituency: 'Lucknow Cantt', district: 'Lucknow', village: 'Rampur', totalVoters: 650 },
      { partNumber: 201, name: 'Public Library, Krishnanagar', assemblyConstituency: 'Lucknow North', district: 'Lucknow', village: 'Krishnanagar', totalVoters: 780 },
      { partNumber: 202, name: 'Government High School, Aminabad', assemblyConstituency: 'Lucknow North', district: 'Lucknow', village: 'Aminabad', totalVoters: 950 },
    ];
    const booths: any[] = [];
    for (const b of boothData) {
      const booth = await Booth.create({ ...b, state: 'Uttar Pradesh', address: `${b.name}, ${b.village}` });
      booths.push(booth);
    }
    console.log(`Created ${booths.length} booths`);

    // --- Sample voters (3 per booth) ---
    let voterCount = 0;
    const castes = ['Brahmin', 'Kshatriya', 'Yadav', 'Kurmi', 'Jatav'];
    const religions = ['Hindu', 'Muslim', 'Hindu', 'Sikh', 'Hindu'];
    for (const booth of booths) {
      for (let i = 1; i <= 3; i++) {
        await Voter.create({
          voterSerialNumber: i,
          epicNumber: `ABC${String(booth.partNumber).padStart(4, '0')}${i}`,
          fullName: `Voter ${booth.partNumber}-${i}`,
          fatherOrHusbandName: `Father ${i}`,
          gender: i % 3 === 0 ? 'F' : 'M',
          age: 25 + i * 5,
          address: `House ${i}, ${booth.village}`,
          boothId: booth._id,
          partNumber: booth.partNumber,
          assemblyConstituency: booth.assemblyConstituency,
          caste: castes[i % castes.length],
          religion: religions[i % religions.length],
          verificationStatus: false,
        });
        voterCount++;
      }
    }
    console.log(`Created ${voterCount} seed voters`);

    // --- Assign booths to staff ---
    await VoterAssignment.create({
      staffId: staffUsers[0]._id,
      boothId: booths[0]._id,
      assignedBy: superAdmin._id,
      isActive: true,
      totalVoters: 3,
      completedCount: 0,
    });
    await VoterAssignment.create({
      staffId: staffUsers[1]._id,
      boothId: booths[1]._id,
      assignedBy: superAdmin._id,
      isActive: true,
      totalVoters: 3,
      completedCount: 0,
    });
    await VoterAssignment.create({
      staffId: staffUsers[2]._id,
      boothId: booths[3]._id,
      assignedBy: superAdmin._id,
      isActive: true,
      totalVoters: 3,
      completedCount: 0,
    });
    console.log('Created 3 voter assignments');

    // --- Demo politician subscription (active Premium) ---
    const now = new Date();
    await Subscription.create({
      politicianId: politician._id,
      tier: 'premium',
      status: 'active',
      assemblyConstituency: 'Lucknow Cantt',
      startDate: now,
      endDate: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
      amount: 49999,
      currency: 'INR',
      paidAt: now,
    });
    console.log('Created active Premium subscription for politician');

    console.log('\n--- POLLSTICS seed complete ---');
    console.log('Logins:');
    console.log('  Super Admin  : admin@pollstics.com / Admin@123   (no OTP)');
    console.log('  Staff 1      : ramesh@pollstics.com / Staff@123  (OTP required)');
    console.log('  Staff 2      : suresh@pollstics.com / Staff@123  (OTP required)');
    console.log('  Staff 3      : anita@pollstics.com  / Staff@123  (OTP required)');
    console.log('  Politician   : rajiv@pollstics.com  / Leader@123 (OTP required)');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
