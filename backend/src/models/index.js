import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// ── USER MODEL ──────────────────────────────────────────────────────────────
export const User = sequelize.define('User', {
  walletAddress: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('CLIENT', 'FREELANCER'),
    defaultValue: 'FREELANCER',
  },
  name: { type: DataTypes.STRING },
  headline: { type: DataTypes.STRING },
  bio: { type: DataTypes.TEXT },
  skills: { type: DataTypes.JSON, defaultValue: [] },
  avatarUrl: { type: DataTypes.STRING },
}, { timestamps: true, createdAt: 'created_at', updatedAt: false });

// ── JOB POSTING MODEL ───────────────────────────────────────────────────────
export const JobPosting = sequelize.define('JobPosting', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  clientAddress: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  category: { type: DataTypes.STRING, allowNull: false },
  budget: { type: DataTypes.STRING, allowNull: false }, // Store string representation of USDC
  status: {
    type: DataTypes.ENUM('OPEN', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'CANCELLED'),
    defaultValue: 'OPEN',
  },
  expires_at: { type: DataTypes.DATE },
}, { timestamps: true, createdAt: 'created_at', updatedAt: false });

// ── PROPOSAL MODEL ──────────────────────────────────────────────────────────
export const Proposal = sequelize.define('Proposal', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  jobId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  freelancerAddress: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  coverLetter: { type: DataTypes.TEXT, allowNull: false },
  bidAmount: { type: DataTypes.STRING, allowNull: false },
  status: {
    type: DataTypes.ENUM('PENDING', 'ACCEPTED', 'REJECTED'),
    defaultValue: 'PENDING',
  },
  submitted_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { timestamps: true, createdAt: 'created_at', updatedAt: false });

// ── CONTRACT MODEL ──────────────────────────────────────────────────────────
export const Contract = sequelize.define('Contract', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  jobId: { type: DataTypes.INTEGER, allowNull: false },
  proposalId: { type: DataTypes.INTEGER, allowNull: false },
  clientAddress: { type: DataTypes.STRING, allowNull: false },
  freelancerAddress: { type: DataTypes.STRING, allowNull: false },
  onChainJobId: { type: DataTypes.STRING, allowNull: true },
  yieldSplitBps: { type: DataTypes.INTEGER, defaultValue: 5000 }, // 50% = 5000 bps
  yieldClient: { type: DataTypes.STRING, defaultValue: '0' },
  yieldFreelancer: { type: DataTypes.STRING, defaultValue: '0' },
  deliverableContent: { type: DataTypes.TEXT },
  status: {
    type: DataTypes.ENUM('ACTIVE', 'SUBMITTED', 'COMPLETED', 'DISPUTED', 'CANCELLED'),
    defaultValue: 'ACTIVE',
  },
}, { timestamps: true, createdAt: 'created_at', updatedAt: false });

// ── MESSAGE MODEL ───────────────────────────────────────────────────────────
export const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  contractId: { type: DataTypes.INTEGER, allowNull: false },
  senderAddress: { type: DataTypes.STRING, allowNull: false },
  text: { type: DataTypes.TEXT, allowNull: false },
}, { timestamps: true, createdAt: 'created_at', updatedAt: false });

// ── RELATIONSHIPS ───────────────────────────────────────────────────────────
User.hasMany(JobPosting, { foreignKey: 'clientAddress', sourceKey: 'walletAddress' });
JobPosting.belongsTo(User, { foreignKey: 'clientAddress', targetKey: 'walletAddress' });

User.hasMany(Proposal, { foreignKey: 'freelancerAddress', sourceKey: 'walletAddress' });
Proposal.belongsTo(User, { foreignKey: 'freelancerAddress', targetKey: 'walletAddress' });

JobPosting.hasMany(Proposal, { foreignKey: 'jobId' });
Proposal.belongsTo(JobPosting, { foreignKey: 'jobId' });

JobPosting.hasOne(Contract, { foreignKey: 'jobId' });
Contract.belongsTo(JobPosting, { foreignKey: 'jobId' });

Proposal.hasOne(Contract, { foreignKey: 'proposalId' });
Contract.belongsTo(Proposal, { foreignKey: 'proposalId' });

Contract.belongsTo(User, { as: 'Client', foreignKey: 'clientAddress', targetKey: 'walletAddress' });
Contract.belongsTo(User, { as: 'Freelancer', foreignKey: 'freelancerAddress', targetKey: 'walletAddress' });

Contract.hasMany(Message, { foreignKey: 'contractId' });
Message.belongsTo(Contract, { foreignKey: 'contractId' });

export { sequelize };
