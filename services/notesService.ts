import { collection, query, where, getDocs, doc, setDoc, deleteDoc, serverTimestamp, orderBy } from "firebase/firestore";
import { db, auth } from "./firebase";
import { UserNote } from "../types";

export interface FirebasePilotNote {
    id: string;
    airportId: string;
    authorId: string;
    authorName: string;
    authorProfilePhoto: string;
    content: string;
    createdAt: any;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const fetchFirebasePilotNotes = async (airportId: string): Promise<UserNote[]> => {
    try {
        const path = 'pilotNotes';
        const q = query(
            collection(db, path), 
            where("airportId", "==", airportId)
        );
        const snapshot = await getDocs(q);
        const notes: UserNote[] = [];
        
        snapshot.forEach(docSnap => {
            const data = docSnap.data() as FirebasePilotNote;
            // Converting to UserNote
            notes.push({
                id: docSnap.id,
                airportId: data.airportId,
                author: data.authorName,
                text: data.content,
                date: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
                type: 'general',
                replies: [],
                authorProfilePhoto: data.authorProfilePhoto,
                authorId: data.authorId
            });
        });
        
        // Sort by date descending
        notes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        return notes;
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'pilotNotes');
        return [];
    }
};

export const saveFirebasePilotNote = async (airportId: string, content: string): Promise<UserNote> => {
    if (!auth.currentUser) throw new Error("Must be logged in");
    
    const id = `note_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const path = `pilotNotes/${id}`;
    
    const newNote: FirebasePilotNote = {
        id: id,
        airportId,
        authorId: auth.currentUser.uid,
        authorName: auth.currentUser.displayName || "Pilot",
        authorProfilePhoto: auth.currentUser.photoURL || "",
        content,
        createdAt: serverTimestamp()
    };
    
    try {
        await setDoc(doc(db, "pilotNotes", id), newNote);
        
        // Return a mock version of the created document for optimistic UI
        return {
            id,
            airportId,
            author: newNote.authorName,
            authorProfilePhoto: newNote.authorProfilePhoto,
            authorId: newNote.authorId,
            text: newNote.content,
            date: new Date().toISOString(),
            type: 'general',
            replies: []
        };
    } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
        throw error;
    }
};

export const deleteFirebasePilotNote = async (noteId: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, "pilotNotes", noteId));
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `pilotNotes/${noteId}`);
        throw error;
    }
};
