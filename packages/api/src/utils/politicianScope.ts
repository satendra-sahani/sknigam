// Politician booth-scoping utilities.
//
// Politicians are licensed to a specific list of booths chosen by an
// admin during the "Add politician" flow (stored as
// `User.assignedBoothIds`).  Every read API that surfaces booth-keyed
// data (booths, voters, analytics roll-ups) must filter to that list so
// a politician can never see data outside the slice their campaign
// team paid for.
//
// We keep the rules dead simple:
//
//   • If `assignedBoothIds` is a non-empty list → results are restricted
//     to those booth IDs.
//   • If `assignedBoothIds` is empty/undefined and the politician has
//     an `assemblyConstituency` set → fall back to AC-wide (legacy
//     behaviour for politicians onboarded before the booth-scope flow
//     existed).
//   • Otherwise → return [] so the politician sees nothing.  Better to
//     fail closed than to leak everything.

import mongoose, { Types } from 'mongoose';
import User from '../models/User';
import Booth from '../models/Booth';
import { AuthRequest } from '../middleware/auth';

export interface PoliticianScope {
  /** Politician role flag — convenience boolean. */
  isPolitician: boolean;
  /** When set, every read must restrict booth._id to this list. */
  boothIds?: Types.ObjectId[];
  /** When `boothIds` is undefined we may still narrow by AC. */
  assemblyConstituency?: string;
  /** True when admin has not granted any booths/AC at all. */
  empty: boolean;
}

/**
 * Resolve the booth scope for the currently authenticated user.  For
 * non-politician roles returns `{isPolitician: false}` — callers leave
 * their existing scoping logic untouched.
 */
export async function getPoliticianScope(req: AuthRequest): Promise<PoliticianScope> {
  if (req.user?.role !== 'politician') {
    return { isPolitician: false, empty: false };
  }
  const user = await User.findById(req.user.userId).select('assignedBoothIds assemblyConstituency');
  const assigned = (user?.assignedBoothIds ?? []) as Types.ObjectId[];
  if (assigned.length > 0) {
    return {
      isPolitician: true,
      boothIds: assigned,
      assemblyConstituency: user?.assemblyConstituency,
      empty: false,
    };
  }
  if (user?.assemblyConstituency) {
    return {
      isPolitician: true,
      assemblyConstituency: user.assemblyConstituency,
      empty: false,
    };
  }
  return { isPolitician: true, empty: true };
}

/**
 * Merge a politician scope into a Mongoose filter targeting the Booth
 * collection.  Mutates `filter` in place for convenience and returns it.
 *
 * @param filter Existing Booth $match
 * @param scope  Politician scope from `getPoliticianScope`
 */
export function applyBoothScope<T extends Record<string, any>>(
  filter: T,
  scope: PoliticianScope,
): T {
  if (!scope.isPolitician) return filter;
  if (scope.empty) {
    // Force-empty result: bogus ObjectId so no booth ever matches.
    (filter as any)._id = new mongoose.Types.ObjectId();
    return filter;
  }
  if (scope.boothIds && scope.boothIds.length > 0) {
    (filter as any)._id = { $in: scope.boothIds };
  } else if (scope.assemblyConstituency) {
    (filter as any).assemblyConstituency = scope.assemblyConstituency;
  }
  return filter;
}

/**
 * Voters are scoped by their booth.  When the politician has explicit
 * booth IDs we filter Voter.boothId; otherwise we fall back to AC.
 */
export function applyVoterScope<T extends Record<string, any>>(
  filter: T,
  scope: PoliticianScope,
): T {
  if (!scope.isPolitician) return filter;
  if (scope.empty) {
    (filter as any)._id = new mongoose.Types.ObjectId();
    return filter;
  }
  if (scope.boothIds && scope.boothIds.length > 0) {
    (filter as any).boothId = { $in: scope.boothIds };
  } else if (scope.assemblyConstituency) {
    (filter as any).assemblyConstituency = scope.assemblyConstituency;
  }
  return filter;
}

/**
 * Returns true if `boothId` is in the politician's allowed scope.  Used
 * by single-resource GETs (e.g. /voters/:id, /booths/:id) before
 * returning the record.
 */
export async function isBoothInScope(
  boothId: Types.ObjectId | string,
  scope: PoliticianScope,
): Promise<boolean> {
  if (!scope.isPolitician) return true;
  if (scope.empty) return false;
  if (scope.boothIds && scope.boothIds.length > 0) {
    const target = boothId.toString();
    return scope.boothIds.some((b) => b.toString() === target);
  }
  if (scope.assemblyConstituency) {
    const booth = await Booth.findById(boothId).select('assemblyConstituency');
    return booth?.assemblyConstituency === scope.assemblyConstituency;
  }
  return false;
}
