import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
        prompt: "select_account"
    });
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
            await setDoc(userRef, {
                id: user.uid,
                email: user.email || "",
                displayName: user.displayName || "Pilot",
                profilePhotoUrl: user.photoURL || ""
            });
        } else {
            const data = userSnap.data();
            if (data.displayName !== user.displayName || data.profilePhotoUrl !== user.photoURL) {
                await updateDoc(userRef, {
                    displayName: user.displayName || "Pilot",
                    profilePhotoUrl: user.photoURL || ""
                });
            }
        }
        
        return user;
    } catch (error) {
        console.error("Google login failed", error);
        throw error;
    }
};

export const logOut = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Logout failed", error);
        throw error;
    }
};
