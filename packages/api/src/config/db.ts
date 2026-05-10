import mongoose from 'mongoose';
import dns from 'dns';

// Node's c-ares resolver sometimes picks up 127.0.0.1 as the DNS server on Windows
// (left behind by Docker / VPN / a former local DNS proxy), which makes mongodb+srv://
// SRV lookups fail with ECONNREFUSED. Force public resolvers when that happens.
const servers = dns.getServers();
if (servers.length === 0 || servers.every((s) => s.startsWith('127.') || s === '::1')) {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
}

const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/election_management';
    const conn = await mongoose.connect(mongoURI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

export default connectDB;
