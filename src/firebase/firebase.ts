import { db } from './config'; 
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where
} from 'firebase/firestore';
import { format } from 'date-fns';

export interface User {
  id?: string; 
  name: string; 
}

export interface Availability {
  id?: string; 
  userId: string;
  date: string; 
  startTime: string; 
  endTime: string; 
}

export interface Shift {
  id?: string;
  userId: string;
  date: string; 
  startTime: string; 
  endTime: string;
  userName?: string;
}

const UsersCollection = collection(db, 'Users'); 

export const getUsers = async (): Promise<User[]> => {
  const querySnapshot = await getDocs(UsersCollection);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as User[];
};

export const addUser = async (name: string): Promise<string> => { 
  const docRef = await addDoc(UsersCollection, { name: name }); 
  return docRef.id;
};

const availabilitiesCollection = collection(db, 'availabilities'); 

export const getAvailabilities = async (): Promise<Availability[]> => {
  const querySnapshot = await getDocs(availabilitiesCollection);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Availability[];
};

export const addAvailability = async (availability: Omit<Availability, 'id'>): Promise<string> => {
  const docRef = await addDoc(availabilitiesCollection, availability);
  return docRef.id;
};

export const updateAvailability = async (id: string, availability: Partial<Omit<Availability, 'id'>>) => {
  const docRef = doc(db, 'availabilities', id);
  await updateDoc(docRef, availability);
};

export const deleteAvailability = async (id: string) => {
  const docRef = doc(db, 'availabilities', id);
  await deleteDoc(docRef);
};

export const getAvailabilitiesByUserAndWeek = async (userId: string, weekStartDate: Date): Promise<Availability[]> => {
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 6); 
    
  const startDateString = format(weekStartDate, 'yyyy-MM-dd'); 
  const endDateString = format(weekEndDate, 'yyyy-MM-dd'); 
    
  const q = query(
    availabilitiesCollection,
    where('userId', '==', userId),
    where('date', '>=', startDateString),
    where('date', '<=', endDateString)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Availability[];
};

const shiftsCollection = collection(db, 'shifts'); 

export const getShifts = async (): Promise<Shift[]> => {
  const querySnapshot = await getDocs(shiftsCollection);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Shift[];
};

export const addShift = async (shift: Omit<Shift, 'id' | 'userName'>): Promise<string> => { 
  const docRef = await addDoc(shiftsCollection, shift);
  return docRef.id;
};

export const updateShift = async (id: string, shift: Partial<Omit<Shift, 'id' | 'userName'>>) => {
  const docRef = doc(db, 'shifts', id);
  await updateDoc(docRef, shift);
};

export const deleteShift = async (id: string) => {
  const docRef = doc(db, 'shifts', id);
  await deleteDoc(docRef);
};

export const getShiftsByWeek = async (weekStartDate: Date): Promise<Shift[]> => {
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6); 

    const startDateString = format(weekStartDate, 'yyyy-MM-dd');
    const endDateString = format(weekEndDate, 'yyyy-MM-dd');

    const q = query(
        shiftsCollection,
        where('date', '>=', startDateString),
        where('date', '<=', endDateString)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })) as Shift[];
};