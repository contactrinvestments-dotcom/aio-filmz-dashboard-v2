/*
 * Copyright (c) 2025 AIO FILMZ MEDIA GROUP LLC. All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * AIO FILMZ MEDIA GROUP LLC. You shall not disclose such Confidential
 * Information and shall use it only in accordance with the terms of the
 * license agreement you entered into with AIO FILMZ MEDIA GROUP LLC.
 */
import React from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    sendPasswordResetEmail 
} from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    addDoc, 
    onSnapshot, 
    doc, 
    deleteDoc, 
    updateDoc, 
    query, 
    where, 
    getDocs, 
    setDoc,
    orderBy,
    writeBatch
} from 'firebase/firestore';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

// --- Custom Hook to load external scripts ---
const useScript = (url, integrity, crossOrigin) => {
    const [loaded, setLoaded] = React.useState(false);
    React.useEffect(() => {
        const script = document.createElement('script');
        script.src = url;
        script.async = true;
        if (integrity) script.integrity = integrity;
        if (crossOrigin) script.crossOrigin = crossOrigin;
        script.onload = () => setLoaded(true);
        document.body.appendChild(script);
        return () => {
            document.body.removeChild(script);
        };
    }, [url, integrity, crossOrigin]);
    return loaded;
};


// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement);

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyCOvHuQL-AMnVOn1pQPyPaS9X5jaboayZE",
  authDomain: "aio-filmz.firebaseapp.com",
  projectId: "aio-filmz",
  storageBucket: "aio-filmz.appspot.com",
  messagingSenderId: "315710713563",
  appId: "1:315710713563:web:933e35e23860c1a7ae26fe",
  measurementId: "G-038N22N48Z"
};

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Helper Components ---

const KpiCard = ({ title, value, colorClass = 'text-gray-900' }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md text-center transition-transform transform hover:scale-105">
        <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</h2>
        <p className={`text-3xl font-bold mt-2 ${colorClass}`}>{value}</p>
    </div>
);

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white dark:bg-gray-800 animate-fadeIn">
                <div className="flex justify-between items-center pb-3">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">{title}</h3>
                    <button onClick={onClose} className="text-black dark:text-white text-3xl leading-none">&times;</button>
                </div>
                {children}
            </div>
        </div>
    );
};

// --- Main Application Components ---

const AuthPage = ({ setView, setFreelancerInfo, setAdminUid }) => {
    const [isAdminLogin, setIsAdminLogin] = React.useState(false);
    const [isFreelancerLogin, setIsFreelancerLogin] = React.useState(false);
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [freelancerName, setFreelancerName] = React.useState('');
    const [freelancerId, setFreelancerId] = React.useState('');
    const [adminSignUpAllowed, setAdminSignUpAllowed] = React.useState(false);
    const [error, setError] = React.useState('');
    const [message, setMessage] = React.useState('');
    const [isForgotPasswordOpen, setForgotPasswordOpen] = React.useState(false);


    React.useEffect(() => {
        const checkAdminExists = async () => {
            try {
                const usersCol = collection(db, 'users');
                const querySnapshot = await getDocs(query(usersCol));
                setAdminSignUpAllowed(querySnapshot.size === 0);
            } catch (error) {
                console.error("Error checking for admin:", error);
                setAdminSignUpAllowed(true);
            }
        };
        checkAdminExists();
    }, []);

    const handleAdminLogin = (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        signInWithEmailAndPassword(auth, email, password)
            .catch(error => setError(`Login Failed: ${error.message}`));
    };

    const handleAdminSignUp = async () => {
        setError('');
        setMessage('');
        if (!adminSignUpAllowed) {
            setError("An admin account already exists. Sign-up is disabled.");
            return;
        }
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            await setDoc(doc(db, 'users', user.uid), { createdAt: new Date(), role: 'admin' });
            setMessage("Admin account created successfully! You can now log in.");
            setAdminSignUpAllowed(false);
        } catch (error) {
             if (error.code === 'permission-denied') {
                setError("Sign up successful, but could not create user profile. Please check your Firestore security rules.");
            } else {
                setError(`Sign Up Failed: ${error.message}`);
            }
        }
    };
    
    const handleForgotPassword = async (resetEmail) => {
        try {
            await sendPasswordResetEmail(auth, resetEmail);
            setForgotPasswordOpen(false);
            setMessage("Password reset email sent! Please check your inbox.");
        } catch (error) {
            throw error;
        }
    };

    const handleFreelancerLogin = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        if (!freelancerName || !freelancerId) return;

        try {
            const freelancersCol = collection(db, 'freelancers');
            const q = query(freelancersCol, where("freelancerId", "==", freelancerId.trim()));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                setError("Freelancer not found. Please check your ID.");
                return;
            }

            let found = false;
            for (const doc of querySnapshot.docs) {
                const freelancer = doc.data();
                if (`${freelancer.firstName} ${freelancer.lastName}`.toLowerCase() === freelancerName.trim().toLowerCase()) {
                    found = true;
                    setAdminUid(freelancer.adminId);
                    setFreelancerInfo({ name: `${freelancer.firstName} ${freelancer.lastName}` });
                    setView('freelancerReport');
                    break;
                }
            }

            if (!found) {
                setError("Freelancer not found. Please check your full name.");
            }
        } catch (error) {
            setError("Could not perform freelancer search. This might be a permissions issue.");
            console.error(error);
        }
    };

    return (
        <>
            <div className="min-h-screen flex items-center justify-center">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md w-full max-w-md text-center">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">AIO FILMZ Portal</h1>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">Welcome! Please select your role.</p>
                    <div className="space-y-4">
                        <button onClick={() => { setIsAdminLogin(true); setIsFreelancerLogin(false); setError(''); setMessage(''); }} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300">Admin Dashboard</button>
                        <button onClick={() => { setIsFreelancerLogin(true); setIsAdminLogin(false); setError(''); setMessage(''); }} className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-6 rounded-lg transition duration-300">Freelancer Portal</button>
                    </div>

                    {error && <p className="text-red-500 mt-4">{error}</p>}
                    {message && <p className="text-green-500 mt-4">{message}</p>}

                    {isAdminLogin && (
                        <form onSubmit={handleAdminLogin} className="mt-6 text-left space-y-4">
                            <h2 className="text-xl font-semibold text-center dark:text-white">Admin Login</h2>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-100 dark:bg-gray-700 dark:text-white" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-100 dark:bg-gray-700 dark:text-white" required />
                            </div>
                            <div className="flex justify-end">
                                <button type="button" onClick={() => setForgotPasswordOpen(true)} className="text-sm text-blue-600 hover:underline">Forgot Password?</button>
                            </div>
                            <div className="flex space-x-2">
                                <button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition">Login</button>
                                {adminSignUpAllowed && <button type="button" onClick={handleAdminSignUp} className="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition">Sign Up</button>}
                            </div>
                        </form>
                    )}

                    {isFreelancerLogin && (
                        <form onSubmit={handleFreelancerLogin} className="mt-6 text-left space-y-4">
                            <h2 className="text-xl font-semibold text-center dark:text-white">Freelancer Login</h2>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Your Full Name</label>
                                <input type="text" value={freelancerName} onChange={e => setFreelancerName(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-100 dark:bg-gray-700 dark:text-white" placeholder="e.g., John Doe" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Your Freelancer ID</label>
                                <input type="text" value={freelancerId} onChange={e => setFreelancerId(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-100 dark:bg-gray-700 dark:text-white" required />
                            </div>
                            <button type="submit" className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-6 rounded-lg transition">View My Report</button>
                        </form>
                    )}
                </div>
            </div>
            <ForgotPasswordModal 
                isOpen={isForgotPasswordOpen} 
                onClose={() => setForgotPasswordOpen(false)} 
                onSendLink={handleForgotPassword} 
            />
        </>
    );
};

const ForgotPasswordModal = ({ isOpen, onClose, onSendLink }) => {
    const [email, setEmail] = React.useState('');
    const [error, setError] = React.useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await onSendLink(email);
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Reset Password">
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">Enter your email address and we'll send you a link to reset your password.</p>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-100 dark:bg-gray-700 dark:text-white" required />
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <div className="flex justify-end space-x-2 pt-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">Send Reset Link</button>
                </div>
            </form>
        </Modal>
    );
};


const AdminDashboard = ({ userId, theme, setTheme }) => {
    const [activeTab, setActiveTab] = React.useState('dashboard');
    // All data states
    const [sales, setSales] = React.useState([]);
    const [clients, setClients] = React.useState([]);
    const [freelancers, setFreelancers] = React.useState([]);
    const [categories, setCategories] = React.useState([]);

    // Filters
    const [filters, setFilters] = React.useState({
        freelancer: 'all',
        categories: [],
        search: '',
        startDate: '',
        endDate: '',
        showUnpaid: false,
    });
    
    // Modal states
    const [isClientModalOpen, setClientModalOpen] = React.useState(false);
    const [isFreelancerModalOpen, setFreelancerModalOpen] = React.useState(false);
    const [isSaleModalOpen, setSaleModalOpen] = React.useState(false);
    const [isBulkSaleModalOpen, setBulkSaleModalOpen] = React.useState(false);
    const [isConfirmModalOpen, setConfirmModalOpen] = React.useState(false);
    const [isShareModalOpen, setShareModalOpen] = React.useState(false);
    const [isPaidDateModalOpen, setPaidDateModalOpen] = React.useState(false);

    const [editingClient, setEditingClient] = React.useState(null);
    const [editingFreelancer, setEditingFreelancer] = React.useState(null);
    const [editingSale, setEditingSale] = React.useState(null);
    const [itemToDelete, setItemToDelete] = React.useState(null);
    const [freelancerToShare, setFreelancerToShare] = React.useState(null);
    const [saleToMarkPaid, setSaleToMarkPaid] = React.useState(null);

    // Firebase data fetching
    React.useEffect(() => {
        if (!userId) return;

        const salesQuery = query(collection(db, `users/${userId}/sales`), orderBy("saleDate", "desc"));
        const unsubscribeSales = onSnapshot(salesQuery, snapshot => {
            setSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => console.error("Firestore sales query failed:", error));

        const unsubscribeClients = onSnapshot(collection(db, `users/${userId}/clients`), snapshot => {
            setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const freelancersQuery = query(collection(db, 'freelancers'), where("adminId", "==", userId));
        const unsubscribeFreelancers = onSnapshot(freelancersQuery, snapshot => {
            setFreelancers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const unsubscribeCategories = onSnapshot(collection(db, `users/${userId}/clientCategories`), snapshot => {
            setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => {
            unsubscribeSales();
            unsubscribeClients();
            unsubscribeFreelancers();
            unsubscribeCategories();
        };
    }, [userId]);

    const handleLogout = () => signOut(auth);

    const filteredSales = React.useMemo(() => {
        return sales.filter(sale => {
            const client = clients.find(c => c.name === sale.clientName);
            const clientCategory = client ? client.category : '';

            if (filters.showUnpaid && sale.status === 'paid') return false;
            if (filters.freelancer !== 'all' && sale.freelancerName !== filters.freelancer) return false;
            if (filters.categories.length > 0 && !filters.categories.includes(clientCategory)) return false;
            if (filters.startDate && sale.saleDate < filters.startDate) return false;
            if (filters.endDate && sale.saleDate > filters.endDate) return false;
            if (filters.search) {
                const searchTerm = filters.search.toLowerCase();
                const inTitle = sale.videoTitle?.toLowerCase().includes(searchTerm);
                const inClient = sale.clientName?.toLowerCase().includes(searchTerm);
                const inFreelancer = sale.freelancerName?.toLowerCase().includes(searchTerm);
                if (!inTitle && !inClient && !inFreelancer) return false;
            }
            return true;
        });
    }, [sales, clients, filters]);
    
    const handleFilterChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (name === 'category') {
            setFilters(prev => ({
                ...prev,
                categories: checked ? [...prev.categories, value] : prev.categories.filter(c => c !== value)
            }));
        } else {
             setFilters(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        }
    };

    // --- CRUD Handlers ---
    const handleSaveClient = async (clientData) => {
        const colRef = collection(db, `users/${userId}/clients`);
        try {
            if (editingClient) {
                await updateDoc(doc(colRef, editingClient.id), clientData);
            } else {
                await addDoc(colRef, clientData);
            }
            setClientModalOpen(false);
            setEditingClient(null);
        } catch (error) {
            console.error("Error saving client:", error);
        }
    };
    
    const handleSaveFreelancer = async (freelancerData) => {
        const colRef = collection(db, 'freelancers');
        try {
            if (editingFreelancer) {
                await updateDoc(doc(colRef, editingFreelancer.id), freelancerData);
            } else {
                await addDoc(colRef, { ...freelancerData, adminId: userId, freelancerId: crypto.randomUUID() });
            }
            setFreelancerModalOpen(false);
            setEditingFreelancer(null);
        } catch (error) {
            console.error("Error saving freelancer:", error);
        }
    };

    const handleSaveSale = async (saleData) => {
        const colRef = collection(db, `users/${userId}/sales`);
        try {
            if (editingSale) {
                await updateDoc(doc(colRef, editingSale.id), saleData);
            } else {
                await addDoc(colRef, { ...saleData, status: 'unpaid' });
            }
            setSaleModalOpen(false);
            setEditingSale(null);
        } catch (error) {
            console.error("Error saving sale:", error);
        }
    };
    
    const handleSaveBulkSales = async (salesData) => {
        const batch = writeBatch(db);
        const salesColRef = collection(db, `users/${userId}/sales`);
        
        salesData.forEach(sale => {
            const newSaleRef = doc(salesColRef);
            batch.set(newSaleRef, sale);
        });

        try {
            await batch.commit();
            setBulkSaleModalOpen(false);
        } catch (error) {
            console.error("Error saving bulk sales:", error);
        }
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        const { type, id } = itemToDelete;
        const collectionName = type === 'freelancer' ? 'freelancers' : `users/${userId}/${type}s`;
        try {
            await deleteDoc(doc(db, collectionName, id));
        } catch (error) {
            console.error(`Error deleting ${type}:`, error);
        }
        setConfirmModalOpen(false);
        setItemToDelete(null);
    };

    const handleTogglePaidStatus = async (sale) => {
        if (sale.status === 'paid') {
            await updateDoc(doc(db, `users/${userId}/sales`, sale.id), { status: 'unpaid', paidDate: null });
        } else {
            setSaleToMarkPaid(sale);
            setPaidDateModalOpen(true);
        }
    };
    
    const handleSetPaidDate = async (paidDate) => {
        if (saleToMarkPaid && paidDate) {
            await updateDoc(doc(db, `users/${userId}/sales`, saleToMarkPaid.id), { status: 'paid', paidDate });
        }
        setPaidDateModalOpen(false);
        setSaleToMarkPaid(null);
    };

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <Header userId={userId} onLogout={handleLogout} theme={theme} setTheme={setTheme} />
            <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
            
            <main>
                {activeTab === 'dashboard' && <DashboardView 
                    filteredSales={filteredSales}
                    clients={clients}
                    freelancers={freelancers}
                    categories={categories}
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    setFilters={setFilters}
                    onAddClient={() => { setEditingClient(null); setClientModalOpen(true); }}
                    onEditClient={(client) => { setEditingClient(client); setClientModalOpen(true); }}
                    onDeleteClient={(id) => { setItemToDelete({type: 'client', id}); setConfirmModalOpen(true); }}
                    onAddFreelancer={() => { setEditingFreelancer(null); setFreelancerModalOpen(true); }}
                    onEditFreelancer={(freelancer) => { setEditingFreelancer(freelancer); setFreelancerModalOpen(true); }}
                    onDeleteFreelancer={(id) => { setItemToDelete({type: 'freelancer', id}); setConfirmModalOpen(true); }}
                    onAddSale={() => { setEditingSale(null); setSaleModalOpen(true); }}
                    onBulkAddSales={() => setBulkSaleModalOpen(true)}
                    onEditSale={(sale) => { setEditingSale(sale); setSaleModalOpen(true); }}
                    onDeleteSale={(id) => { setItemToDelete({type: 'sale', id}); setConfirmModalOpen(true); }}
                    onShare={(freelancerName) => { setFreelancerToShare(freelancerName); setShareModalOpen(true); }}
                    onTogglePaid={handleTogglePaidStatus}
                />}
                {activeTab === 'analytics' && <AnalyticsView salesData={filteredSales} theme={theme} />}
            </main>

            {/* Modals */}
            <ClientFormModal isOpen={isClientModalOpen} onClose={() => setClientModalOpen(false)} onSave={handleSaveClient} client={editingClient} categories={categories} userId={userId} />
            <FreelancerFormModal isOpen={isFreelancerModalOpen} onClose={() => setFreelancerModalOpen(false)} onSave={handleSaveFreelancer} freelancer={editingFreelancer} />
            <SaleFormModal isOpen={isSaleModalOpen} onClose={() => setSaleModalOpen(false)} onSave={handleSaveSale} sale={editingSale} clients={clients} freelancers={freelancers} />
            <BulkSaleFormModal isOpen={isBulkSaleModalOpen} onClose={() => setBulkSaleModalOpen(false)} onSave={handleSaveBulkSales} clients={clients} freelancers={freelancers} />
            <ConfirmModal isOpen={isConfirmModalOpen} onClose={() => setConfirmModalOpen(false)} onConfirm={handleDelete} itemType={itemToDelete?.type} />
            <ShareModal isOpen={isShareModalOpen} onClose={() => setShareModalOpen(false)} freelancerName={freelancerToShare} sales={sales} />
            <PaidDateModal isOpen={isPaidDateModalOpen} onClose={() => setPaidDateModalOpen(false)} onSave={handleSetPaidDate} />
        </div>
    );
};

const Header = ({ userId, onLogout, theme, setTheme }) => (
    <header className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AIO FILMZ Sales Dashboard</h1>
                <p className="text-gray-600 dark:text-gray-300 mt-1">Track sales, commissions and profits</p>
            </div>
            <div className="mt-4 sm:mt-0 flex items-center space-x-4">
                 <p className="text-sm text-gray-500 dark:text-gray-400">Your User ID: <span className="font-mono bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">{userId}</span></p>
                 <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                    {theme === 'light' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                    )}
                 </button>
                 <button onClick={onLogout} className="text-sm text-red-500 hover:underline">Logout</button>
            </div>
        </div>
    </header>
);

const TabNavigation = ({ activeTab, setActiveTab }) => {
    const activeClasses = 'bg-blue-600 text-white shadow-lg -translate-y-1';
    const inactiveClasses = 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200';
    return (
        <nav className="flex justify-center items-center space-x-4 mb-8">
            <button onClick={() => setActiveTab('dashboard')} className={`px-6 py-3 font-semibold rounded-lg shadow-sm transition-all duration-300 ease-in-out hover:shadow-md hover:-translate-y-1 ${activeTab === 'dashboard' ? activeClasses : inactiveClasses}`}>Dashboard</button>
            <button onClick={() => setActiveTab('analytics')} className={`px-6 py-3 font-semibold rounded-lg shadow-sm transition-all duration-300 ease-in-out hover:shadow-md hover:-translate-y-1 ${activeTab === 'analytics' ? activeClasses : inactiveClasses}`}>Analytics</button>
        </nav>
    );
};

const DashboardView = (props) => {
    const { filteredSales, clients, freelancers, categories, filters, onFilterChange, setFilters, onAddClient, onEditClient, onDeleteClient, onAddFreelancer, onEditFreelancer, onDeleteFreelancer, onAddSale, onBulkAddSales, onEditSale, onDeleteSale, onShare, onTogglePaid } = props;
    
    const exportToCsv = () => {
        if (filteredSales.length === 0) {
            alert("No data to export.");
            return;
        }
        const headers = ['Date', 'Freelancer', 'Video Title', 'Client', 'Sale Amount', 'Commission Rate (%)', 'Commission Earned', 'Profit', 'Status', 'Paid On'];
        const csvRows = [headers.join(',')];
        for (const sale of filteredSales) {
            const commissionEarned = (Number(sale.saleAmount) || 0) * (Number(sale.commissionRate) || 0) / 100;
            const profit = (Number(sale.saleAmount) || 0) - commissionEarned;
            const values = [
                sale.saleDate,
                `"${sale.freelancerName.replace(/"/g, '""')}"`,
                `"${(sale.videoTitle || '').replace(/"/g, '""')}"`,
                `"${sale.clientName.replace(/"/g, '""')}"`,
                sale.saleAmount,
                sale.commissionRate,
                commissionEarned.toFixed(2),
                profit.toFixed(2),
                sale.status || 'unpaid',
                sale.paidDate || ''
            ];
            csvRows.push(values.join(','));
        }
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', 'sales_report.csv');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <div>
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <ClientManager clients={clients} onAdd={onAddClient} onEdit={onEditClient} onDelete={onDeleteClient} />
                <FreelancerManager freelancers={freelancers} onAdd={onAddFreelancer} onEdit={onEditFreelancer} onDelete={onDeleteFreelancer} />
            </section>
            <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
                    <div className="flex items-center space-x-2">
                        <button onClick={onAddSale} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg transition duration-300 ease-in-out transform hover:-translate-y-1">Add Sale</button>
                        <button onClick={onBulkAddSales} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg transition duration-300 ease-in-out transform hover:-translate-y-1">Bulk Add Sales</button>
                        <button onClick={() => setFilters(f => ({...f, showUnpaid: !f.showUnpaid}))} className={`px-4 py-2 text-sm font-semibold rounded-lg shadow-sm transition-colors ${filters.showUnpaid ? 'bg-yellow-400 text-yellow-900 ring-2 ring-yellow-500' : 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300'}`}>Show Unpaid</button>
                        <button onClick={exportToCsv} className="px-4 py-2 text-sm font-semibold text-green-800 bg-green-200 rounded-lg shadow-sm hover:bg-green-300 transition-colors">Export CSV</button>
                    </div>
                    <div className="mt-4 sm:mt-0 w-full sm:w-auto sm:max-w-xs">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter by Freelancer</label>
                        <select name="freelancer" value={filters.freelancer} onChange={onFilterChange} className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="all">All Freelancers</option>
                            {freelancers.map(f => <option key={f.id} value={`${f.firstName} ${f.lastName}`}>{`${f.firstName} ${f.lastName}`}</option>)}
                        </select>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Search</label>
                        <input type="text" name="search" value={filters.search} onChange={onFilterChange} className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-100 dark:bg-gray-700 dark:text-white" placeholder="Search by title, client..." />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
                        <input type="date" name="startDate" value={filters.startDate} onChange={onFilterChange} className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-100 dark:bg-gray-700 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
                        <input type="date" name="endDate" value={filters.endDate} onChange={onFilterChange} className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-100 dark:bg-gray-700 dark:text-white" />
                    </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Category</label>
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {categories.map(cat => (
                             <label key={cat.id} className="inline-flex items-center">
                                <input type="checkbox" name="category" value={cat.name} checked={filters.categories.includes(cat.name)} onChange={onFilterChange} className="form-checkbox h-5 w-5 text-blue-600"/>
                                <span className="ml-2 text-gray-700 dark:text-gray-300">{cat.name}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>
            <SalesTable sales={filteredSales} onEdit={onEditSale} onDelete={onDeleteSale} onShare={onShare} onTogglePaid={onTogglePaid} />
        </div>
    );
};

const AnalyticsView = ({ salesData, theme }) => {
    const kpis = React.useMemo(() => {
        const totalRevenue = salesData.reduce((sum, sale) => sum + (Number(sale.saleAmount) || 0), 0);
        const totalCommissions = salesData.reduce((sum, sale) => {
            const commission = (Number(sale.saleAmount) || 0) * (Number(sale.commissionRate) || 0) / 100;
            return sum + commission;
        }, 0);
        const netProfit = totalRevenue - totalCommissions;
        const unpaidCommissions = salesData.filter(s => s.status !== 'paid').reduce((sum, sale) => sum + ((Number(sale.saleAmount) || 0) * (Number(sale.commissionRate) || 0) / 100), 0);
        return { totalRevenue, totalCommissions, netProfit, unpaidCommissions };
    }, [salesData]);

    const chartOptions = React.useMemo(() => {
        const isDark = theme === 'dark';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        const textColor = isDark ? '#E5E7EB' : '#1F2937';

        return {
            responsive: true,
            scales: {
                y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: textColor } },
                x: { grid: { color: gridColor }, ticks: { color: textColor } }
            },
            plugins: {
                legend: { labels: { color: textColor } }
            }
        };
    }, [theme]);

    const chartData = React.useMemo(() => {
        const freelancerData = salesData.reduce((acc, sale) => {
            const commission = (Number(sale.saleAmount) || 0) * (Number(sale.commissionRate) || 0) / 100;
            if (!isNaN(commission) && sale.freelancerName) {
                acc[sale.freelancerName] = (acc[sale.freelancerName] || 0) + commission;
            }
            return acc;
        }, {});
        const sortedFreelancers = Object.entries(freelancerData).sort((a, b) => b[1] - a[1]).slice(0, 5);

        const clientData = salesData.reduce((acc, sale) => {
            const revenue = Number(sale.saleAmount) || 0;
            if (!isNaN(revenue) && sale.clientName) {
                acc[sale.clientName] = (acc[sale.clientName] || 0) + revenue;
            }
            return acc;
        }, {});
        const sortedClients = Object.entries(clientData).sort((a, b) => b[1] - a[1]).slice(0, 5);

        return {
            freelancerChart: {
                labels: sortedFreelancers.map(f => f[0]),
                datasets: [{ label: 'Commission Earned', data: sortedFreelancers.map(f => f[1]), backgroundColor: 'rgba(101, 116, 205, 0.8)' }]
            },
            clientChart: {
                labels: sortedClients.map(c => c[0]),
                datasets: [{ label: 'Revenue', data: sortedClients.map(c => c[1]), backgroundColor: 'rgba(129, 140, 248, 0.8)' }]
            }
        };
    }, [salesData]);

    const formatCurrency = (amount) => `$${amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

    return (
        <div>
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <KpiCard title="Total Revenue" value={formatCurrency(kpis.totalRevenue)} />
                <KpiCard title="Total Commissions" value={formatCurrency(kpis.totalCommissions)} />
                <KpiCard title="Net Profit" value={formatCurrency(kpis.netProfit)} colorClass="text-green-700" />
                <KpiCard title="Unpaid Commissions" value={formatCurrency(kpis.unpaidCommissions)} colorClass="text-yellow-700" />
            </section>
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Top Freelancers by Commission</h2>
                    <Bar data={chartData.freelancerChart} options={chartOptions} />
                </div>
                <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Top Clients by Revenue</h2>
                    <Bar data={chartData.clientChart} options={{ ...chartOptions, indexAxis: 'y' }} />
                </div>
            </section>
        </div>
    );
};

const ClientManager = ({ clients, onAdd, onEdit, onDelete }) => (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Manage Clients</h2>
            <button onClick={onAdd} className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg transition">Add Client</button>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto">
            {clients.length > 0 ? clients.map(c => (
                <div key={c.id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded text-gray-800 dark:text-gray-200">
                    <span>{c.name} <span className="text-xs text-gray-500 dark:text-gray-400">{c.category || ''}</span></span>
                    <span>${c.price}</span>
                    <div>
                        <button onClick={() => onEdit(c)} className="text-blue-600 hover:text-blue-900 mr-2">Edit</button>
                        <button onClick={() => onDelete(c.id)} className="text-red-600 hover:text-red-900">Delete</button>
                    </div>
                </div>
            )) : <p className="text-gray-500 dark:text-gray-400">No clients added yet.</p>}
        </div>
    </div>
);

const FreelancerManager = ({ freelancers, onAdd, onEdit, onDelete }) => {
    const handleCopyId = (freelancerId) => {
        const textArea = document.createElement('textarea');
        textArea.value = freelancerId;
        textArea.style.position = 'fixed'; // Prevent scrolling to bottom of page in MS Edge.
        textArea.style.top = '0';
        textArea.style.left = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
        } catch (err) {
            console.error('Failed to copy ID: ', err);
        }
        document.body.removeChild(textArea);
    };

    return (
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Manage Freelancers</h2>
                <button onClick={onAdd} className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-lg transition">Add Freelancer</button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
                {freelancers.length > 0 ? freelancers.map(f => (
                    <div key={f.id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <div className="flex-grow text-gray-800 dark:text-gray-200">
                            <span className="font-medium">{`${f.firstName} ${f.lastName}`} - {f.commission}%</span>
                            <div className="text-xs text-gray-500 dark:text-gray-400">ID: {f.freelancerId} <button onClick={() => handleCopyId(f.freelancerId)} className="ml-2 text-blue-500 hover:underline">[Copy]</button></div>
                        </div>
                        <div>
                            <button onClick={() => onEdit(f)} className="text-blue-600 hover:text-blue-900 mr-2">Edit</button>
                            <button onClick={() => onDelete(f.id)} className="text-red-600 hover:text-red-900">Delete</button>
                        </div>
                    </div>
                )) : <p className="text-gray-500 dark:text-gray-400">No freelancers added yet.</p>}
            </div>
        </div>
    );
};

const SalesTable = ({ sales, onEdit, onDelete, onShare, onTogglePaid }) => {
    const totals = React.useMemo(() => {
        const totalSale = sales.reduce((sum, s) => sum + (Number(s.saleAmount) || 0), 0);
        const totalCommission = sales.reduce((sum, s) => sum + ((Number(s.saleAmount) || 0) * (Number(s.commissionRate) || 0) / 100), 0);
        const totalProfit = totalSale - totalCommission;
        return { totalSale, totalCommission, totalProfit };
    }, [sales]);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString.replace(/-/g, '/'));
        return date.toLocaleDateString();
    };
    
    const formatCurrency = (amount) => amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});

    return (
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full leading-normal">
                    <thead>
                        <tr className="border-b-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                           <th className="px-5 py-3">Date</th>
                           <th className="px-5 py-3">Freelancer</th>
                           <th className="px-5 py-3">Video Title</th>
                           <th className="px-5 py-3">Client</th>
                           <th className="px-5 py-3">Sale Amount</th>
                           <th className="px-5 py-3">Commission</th>
                           <th className="px-5 py-3">Profit</th>
                           <th className="px-5 py-3">Status</th>
                           <th className="px-5 py-3">Paid On</th>
                           <th className="px-5 py-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-700 dark:text-gray-200">
                        {sales.length > 0 ? sales.map(sale => {
                            const commission = (Number(sale.saleAmount) || 0) * (Number(sale.commissionRate) || 0) / 100;
                            const profit = (Number(sale.saleAmount) || 0) - commission;
                            const isPaid = sale.status === 'paid';
                            return (
                                <tr key={sale.id} className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 ${isPaid ? 'bg-green-50 dark:bg-green-900/20' : ''}`}>
                                    <td className="px-5 py-5 text-sm">{formatDate(sale.saleDate)}</td>
                                    <td className="px-5 py-5 text-sm">{sale.freelancerName}</td>
                                    <td className="px-5 py-5 text-sm font-medium text-gray-900 dark:text-white">{sale.videoTitle || ''}</td>
                                    <td className="px-5 py-5 text-sm">{sale.clientName}</td>
                                    <td className="px-5 py-5 text-sm">${formatCurrency(sale.saleAmount)}</td>
                                    <td className="px-5 py-5 text-sm">${formatCurrency(commission)}</td>
                                    <td className="px-5 py-5 text-sm font-semibold text-green-600">${formatCurrency(profit)}</td>
                                    <td className="px-5 py-5 text-sm">
                                        <button onClick={() => onTogglePaid(sale)} className={`px-3 py-1 text-xs font-semibold rounded-full ${isPaid ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'}`}>
                                            {isPaid ? 'Paid' : 'Unpaid'}
                                        </button>
                                    </td>
                                    <td className="px-5 py-5 text-sm">{formatDate(sale.paidDate)}</td>
                                    <td className="px-5 py-5 text-sm text-center">
                                        <button onClick={() => onEdit(sale)} className="text-blue-600 hover:text-blue-900 mr-2">Edit</button>
                                        <button onClick={() => onShare(sale.freelancerName)} className="text-green-600 hover:text-green-900">Share</button>
                                        <button onClick={() => onDelete(sale.id)} className="text-red-600 hover:text-red-900 ml-2">Delete</button>
                                    </td>
                                </tr>
                            );
                        }) : (
                            <tr><td colSpan="10" className="text-center p-8">No matching sales found.</td></tr>
                        )}
                    </tbody>
                    <tfoot className="bg-gray-200 dark:bg-gray-700 font-bold text-gray-800 dark:text-gray-200 text-sm">
                        <tr>
                            <td className="px-5 py-4 text-right" colSpan="4">Totals:</td>
                            <td className="px-5 py-4">${formatCurrency(totals.totalSale)}</td>
                            <td className="px-5 py-4">${formatCurrency(totals.totalCommission)}</td>
                            <td className="px-5 py-4 text-green-700">${formatCurrency(totals.totalProfit)}</td>
                            <td colSpan="3"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

// --- Modal Components ---

const ClientFormModal = ({ isOpen, onClose, onSave, client, categories, userId }) => {
    const [name, setName] = React.useState('');
    const [price, setPrice] = React.useState('');
    const [category, setCategory] = React.useState('');
    const [newCategory, setNewCategory] = React.useState('');

    React.useEffect(() => {
        if (client) {
            setName(client.name);
            setPrice(client.price);
            setCategory(client.category || '');
        } else {
            setName('');
            setPrice('');
            setCategory('');
        }
    }, [client, isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ name, price: parseFloat(price), category });
    };
    
    const handleAddNewCategory = async () => {
        if (newCategory && !categories.some(c => c.name === newCategory)) {
            await addDoc(collection(db, `users/${userId}/clientCategories`), { name: newCategory });
            setNewCategory('');
            setCategory(newCategory);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={client ? 'Edit Client' : 'Add New Client'}>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <input value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2 text-gray-700 bg-gray-200 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none" type="text" placeholder="Client Name" required />
                <input value={price} onChange={e => setPrice(e.target.value)} className="w-full px-4 py-2 text-gray-700 bg-gray-200 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none" type="number" step="0.01" placeholder="Fixed Video Price ($)" required />
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                    <select value={category} onChange={e => setCategory(e.target.value)} className="w-full mt-1 px-4 py-2 text-gray-700 bg-gray-200 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none">
                        <option value="">Select a Category</option>
                        {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                    </select>
                </div>
                <div className="flex items-center space-x-2">
                    <input value={newCategory} onChange={e => setNewCategory(e.target.value)} className="w-full px-4 py-2 text-gray-700 bg-gray-200 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none" type="text" placeholder="Or add new category" />
                    <button type="button" onClick={handleAddNewCategory} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg">Add</button>
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600">Save Client</button>
                </div>
            </form>
        </Modal>
    );
};

const FreelancerFormModal = ({ isOpen, onClose, onSave, freelancer }) => {
    const [firstName, setFirstName] = React.useState('');
    const [lastName, setLastName] = React.useState('');
    const [commission, setCommission] = React.useState('');
    const [email, setEmail] = React.useState('');

    React.useEffect(() => {
        if (freelancer) {
            setFirstName(freelancer.firstName);
            setLastName(freelancer.lastName);
            setCommission(freelancer.commission);
            setEmail(freelancer.email || '');
        } else {
            setFirstName('');
            setLastName('');
            setCommission('');
            setEmail('');
        }
    }, [freelancer, isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ firstName, lastName, commission: parseFloat(commission), email });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={freelancer ? 'Edit Freelancer' : 'Add New Freelancer'}>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <input value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full px-4 py-2 text-gray-700 bg-gray-200 dark:bg-gray-700 dark:text-white rounded-lg" type="text" placeholder="First Name" required />
                <input value={lastName} onChange={e => setLastName(e.target.value)} className="w-full px-4 py-2 text-gray-700 bg-gray-200 dark:bg-gray-700 dark:text-white rounded-lg" type="text" placeholder="Last Name" required />
                <input value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-2 text-gray-700 bg-gray-200 dark:bg-gray-700 dark:text-white rounded-lg" type="email" placeholder="Email Address" required />
                <input value={commission} onChange={e => setCommission(e.target.value)} className="w-full px-4 py-2 text-gray-700 bg-gray-200 dark:bg-gray-700 dark:text-white rounded-lg" type="number" step="0.1" placeholder="Commission Rate (%)" required />
                <div className="flex justify-end space-x-2 pt-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600">Save Freelancer</button>
                </div>
            </form>
        </Modal>
    );
};

const SaleFormModal = ({ isOpen, onClose, onSave, sale, clients, freelancers }) => {
    const [videoTitle, setVideoTitle] = React.useState('');
    const [clientId, setClientId] = React.useState('');
    const [freelancerId, setFreelancerId] = React.useState('');
    const [saleAmount, setSaleAmount] = React.useState('');
    const [commissionRate, setCommissionRate] = React.useState('');
    const [saleDate, setSaleDate] = React.useState('');

    React.useEffect(() => {
        if (sale) {
            const client = clients.find(c => c.name === sale.clientName);
            const freelancer = freelancers.find(f => `${f.firstName} ${f.lastName}` === sale.freelancerName);
            setVideoTitle(sale.videoTitle);
            setClientId(client ? client.id : '');
            setFreelancerId(freelancer ? freelancer.id : '');
            setSaleAmount(sale.saleAmount);
            setCommissionRate(sale.commissionRate);
            setSaleDate(sale.saleDate);
        } else {
            setVideoTitle(''); setClientId(''); setFreelancerId(''); setSaleAmount(''); setCommissionRate(''); setSaleDate('');
        }
    }, [sale, clients, freelancers, isOpen]);
    
    React.useEffect(() => {
        const client = clients.find(c => c.id === clientId);
        if (client) setSaleAmount(client.price);
    }, [clientId, clients]);

    React.useEffect(() => {
        const freelancer = freelancers.find(f => f.id === freelancerId);
        if (freelancer) setCommissionRate(freelancer.commission);
    }, [freelancerId, freelancers]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const client = clients.find(c => c.id === clientId);
        const freelancer = freelancers.find(f => f.id === freelancerId);
        if (!client || !freelancer) {
            alert("Please select a valid client and freelancer.");
            return;
        }
        onSave({
            videoTitle,
            clientName: client.name,
            freelancerName: `${freelancer.firstName} ${freelancer.lastName}`,
            saleAmount: parseFloat(saleAmount),
            commissionRate: parseFloat(commissionRate),
            saleDate,
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={sale ? 'Edit Sale' : 'Add New Sale'}>
             <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <input value={videoTitle} onChange={e => setVideoTitle(e.target.value)} className="w-full px-4 py-2 text-gray-700 bg-gray-200 dark:bg-gray-700 dark:text-white rounded-lg" type="text" placeholder="Video Title" required />
                <select value={clientId} onChange={e => setClientId(e.target.value)} className="w-full px-4 py-2 text-gray-700 bg-gray-200 dark:bg-gray-700 dark:text-white rounded-lg" required>
                    <option value="">Select a Client</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select value={freelancerId} onChange={e => setFreelancerId(e.target.value)} className="w-full px-4 py-2 text-gray-700 bg-gray-200 dark:bg-gray-700 dark:text-white rounded-lg" required>
                    <option value="">Select a Freelancer</option>
                    {freelancers.map(f => <option key={f.id} value={f.id}>{`${f.firstName} ${f.lastName}`}</option>)}
                </select>
                <input value={saleAmount} onChange={e => setSaleAmount(e.target.value)} className="w-full px-4 py-2 text-gray-700 bg-gray-200 dark:bg-gray-700 dark:text-white rounded-lg" type="number" placeholder="Sale Amount ($)" />
                <input value={commissionRate} className="w-full px-4 py-2 text-gray-700 bg-gray-300 dark:bg-gray-600 dark:text-gray-300 rounded-lg" type="number" placeholder="Commission Rate (%)" readOnly />
                <input value={saleDate} onChange={e => setSaleDate(e.target.value)} className="w-full px-4 py-2 text-gray-700 bg-gray-200 dark:bg-gray-700 dark:text-white rounded-lg" type="date" required />
                <div className="flex justify-end space-x-2 pt-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">Save Sale</button>
                </div>
            </form>
        </Modal>
    );
};

const BulkSaleFormModal = ({ isOpen, onClose, onSave, clients, freelancers }) => {
    const [freelancerId, setFreelancerId] = React.useState('');
    const [saleDate, setSaleDate] = React.useState(new Date().toISOString().split('T')[0]);
    const [rows, setRows] = React.useState([{ id: 1, videoTitle: '', clientId: '' }]);

    const handleAddRow = () => {
        setRows(prev => [...prev, { id: Date.now(), videoTitle: '', clientId: '' }]);
    };

    const handleRowChange = (id, field, value) => {
        setRows(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
    };
    
    const handleRemoveRow = (id) => {
        setRows(prev => prev.filter(row => row.id !== id));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const freelancer = freelancers.find(f => f.id === freelancerId);
        if (!freelancer) {
            alert("Please select a freelancer.");
            return;
        }

        const salesData = rows
            .filter(row => row.videoTitle && row.clientId)
            .map(row => {
                const client = clients.find(c => c.id === row.clientId);
                return {
                    videoTitle: row.videoTitle,
                    clientName: client.name,
                    freelancerName: `${freelancer.firstName} ${freelancer.lastName}`,
                    saleAmount: parseFloat(client.price),
                    commissionRate: parseFloat(freelancer.commission),
                    saleDate,
                    status: 'unpaid'
                };
            });
        
        if (salesData.length > 0) {
            onSave(salesData);
        } else {
            alert("Please fill out at least one valid sale row.");
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Bulk Add Sales">
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Freelancer</label>
                        <select value={freelancerId} onChange={e => setFreelancerId(e.target.value)} className="w-full mt-1 px-4 py-2 text-gray-700 bg-gray-200 dark:bg-gray-700 dark:text-white rounded-lg" required>
                            <option value="">Select a Freelancer</option>
                            {freelancers.map(f => <option key={f.id} value={f.id}>{`${f.firstName} ${f.lastName}`}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sale Date</label>
                        <input value={saleDate} onChange={e => setSaleDate(e.target.value)} className="w-full mt-1 px-4 py-2 text-gray-700 bg-gray-200 dark:bg-gray-700 dark:text-white rounded-lg" type="date" required />
                    </div>
                </div>
                <hr className="dark:border-gray-600"/>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {rows.map((row, index) => (
                        <div key={row.id} className="grid grid-cols-3 gap-2 items-center">
                            <input value={row.videoTitle} onChange={e => handleRowChange(row.id, 'videoTitle', e.target.value)} className="col-span-1 w-full px-4 py-2 text-gray-700 bg-gray-200 dark:bg-gray-700 dark:text-white rounded-lg" type="text" placeholder={`Video Title ${index + 1}`} required />
                            <select value={row.clientId} onChange={e => handleRowChange(row.id, 'clientId', e.target.value)} className="col-span-1 w-full px-4 py-2 text-gray-700 bg-gray-200 dark:bg-gray-700 dark:text-white rounded-lg" required>
                                <option value="">Select a Client</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <button type="button" onClick={() => handleRemoveRow(row.id)} className="text-red-500 hover:text-red-700 font-bold">Remove</button>
                        </div>
                    ))}
                </div>
                <button type="button" onClick={handleAddRow} className="w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 font-bold py-2 px-4 rounded-lg">Add Another Sale</button>
                <div className="flex justify-end space-x-2 pt-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Save All Sales</button>
                </div>
            </form>
        </Modal>
    );
};


const ConfirmModal = ({ isOpen, onClose, onConfirm, itemType }) => (
    <Modal isOpen={isOpen} onClose={onClose} title="Are you sure?">
        <div className="mt-3 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </div>
            <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500 dark:text-gray-300">Are you sure you want to delete this {itemType}? This action cannot be undone.</p>
            </div>
            <div className="items-center px-4 py-3 sm:flex">
                <button onClick={onConfirm} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 sm:ml-3 sm:w-auto sm:text-sm">Delete</button>
                <button onClick={onClose} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">Cancel</button>
            </div>
        </div>
    </Modal>
);

const ShareModal = ({ isOpen, onClose, freelancerName, sales }) => {
    const reportRef = React.useRef();
    const jspdfLoaded = useScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    const html2canvasLoaded = useScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');


    const sendEmail = () => {
        if (!freelancerName) return;
        const freelancerSales = sales.filter(sale => sale.freelancerName === freelancerName);
        let totalCommission = 0;
        let reportText = `Hello ${freelancerName},\n\nHere is your commission report:\n\n`;
        
        freelancerSales.forEach(sale => {
            const commission = (sale.saleAmount * sale.commissionRate / 100);
            totalCommission += commission;
            reportText += `---------------------------------\n`;
            reportText += `Date: ${new Date(sale.saleDate.replace(/-/g, '/')).toLocaleDateString()}\n`;
            reportText += `Video Title: ${sale.videoTitle}\n`;
            reportText += `Client: ${sale.clientName}\n`;
            reportText += `Commission: $${commission.toFixed(2)}\n`;
            reportText += `Status: ${sale.status || 'unpaid'}\n`;
        });
        reportText += `---------------------------------\n`;
        reportText += `Total Earned: $${totalCommission.toFixed(2)}\n\n`;
        window.open(`mailto:?subject=Your Commission Report&body=${encodeURIComponent(reportText)}`, '_blank');
    };

    const downloadPdf = async () => {
        if (!jspdfLoaded || !html2canvasLoaded) {
            alert("PDF generation library is still loading. Please try again in a moment.");
            return;
        }
        const { jsPDF } = window.jspdf;
        const html2canvas = window.html2canvas;

        const canvas = await html2canvas(reportRef.current);
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF();
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${freelancerName}_report.pdf`);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Share Report">
            <div className="my-5">
                <p className="mb-4 dark:text-gray-300">Generate a report for <strong>{freelancerName}</strong>:</p>
                <div className="flex space-x-2">
                    <button onClick={sendEmail} className="w-full text-center block bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">Send as Email</button>
                    <button onClick={downloadPdf} disabled={!jspdfLoaded || !html2canvasLoaded} className="w-full text-center block bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:bg-gray-400">
                        {jspdfLoaded && html2canvasLoaded ? 'Download as PDF' : 'Loading PDF...'}
                    </button>
                </div>
            </div>
            {/* Hidden div for PDF generation */}
            <div className="absolute -left-full">
                <div ref={reportRef} className="p-8 bg-white text-black">
                    <h1 className="text-2xl font-bold mb-4">Report for {freelancerName}</h1>
                    <table className="min-w-full border">
                        <thead><tr className="border-b bg-gray-100"><th className="px-4 py-2 text-left">Date</th><th className="px-4 py-2 text-left">Video Title</th><th className="px-4 py-2 text-left">Commission</th></tr></thead>
                        <tbody>
                            {sales.filter(s => s.freelancerName === freelancerName).map(s => (
                                <tr key={s.id} className="border-b">
                                    <td className="px-4 py-2">{new Date(s.saleDate.replace(/-/g, '/')).toLocaleDateString()}</td>
                                    <td className="px-4 py-2">{s.videoTitle}</td>
                                    <td className="px-4 py-2">$ {((s.saleAmount * s.commissionRate) / 100).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </Modal>
    );
};

const PaidDateModal = ({ isOpen, onClose, onSave }) => {
    const [paidDate, setPaidDate] = React.useState(new Date().toISOString().split('T')[0]);
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Set Payment Date">
            <div className="mt-4">
                <input type="date" value={paidDate} onChange={e => setPaidDate(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 dark:text-white" />
            </div>
            <div className="mt-4 flex justify-end space-x-2">
                <button onClick={onClose} className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400">Cancel</button>
                <button onClick={() => onSave(paidDate)} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">Save Date</button>
            </div>
        </Modal>
    );
};

const FreelancerReport = ({ adminUid, freelancerInfo, setView }) => {
    const [sales, setSales] = React.useState([]);
    const [notifications, setNotifications] = React.useState([]);
    const [showNotifications, setShowNotifications] = React.useState(false);
    const salesRef = React.useRef([]);
    const reportRef = React.useRef();
    const jspdfLoaded = useScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    const html2canvasLoaded = useScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    const [theme, setTheme] = React.useState(localStorage.getItem('freelancerTheme') || 'light');

    React.useEffect(() => {
        localStorage.setItem('freelancerTheme', theme);
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    React.useEffect(() => {
        if (!adminUid || !freelancerInfo) return;
        const q = query(
            collection(db, `users/${adminUid}/sales`),
            where("freelancerName", "==", freelancerInfo.name)
        );
        const unsubscribe = onSnapshot(q, snapshot => {
            const fetchedSales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const sortedSales = fetchedSales.sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate));
            
            // Notification Logic
            if (salesRef.current.length > 0) {
                const oldSales = salesRef.current;
                const newSales = sortedSales;

                // New Sale Notification
                if (newSales.length > oldSales.length) {
                    const newSale = newSales[0];
                    setNotifications(prev => [`New sale added: ${newSale.videoTitle}`, ...prev]);
                }

                // Payment Sent Notification
                newSales.forEach(newSale => {
                    const oldSale = oldSales.find(s => s.id === newSale.id);
                    if (oldSale && oldSale.status !== 'paid' && newSale.status === 'paid') {
                        const commission = (newSale.saleAmount * newSale.commissionRate / 100).toFixed(2);
                        setNotifications(prev => [`Payment of $${commission} for "${newSale.videoTitle}" has been sent!`, ...prev]);
                    }
                });
            }
            
            salesRef.current = sortedSales;
            setSales(sortedSales);
        }, (error) => console.error("Error fetching freelancer report:", error));
        return unsubscribe;
    }, [adminUid, freelancerInfo]);

    const { totalEarned, amountOwed, monthlyCommissions, clientCommissions } = React.useMemo(() => {
        let total = 0;
        let owed = 0;
        const monthly = {};
        const byClient = {};

        sales.forEach(sale => {
            const commission = (sale.saleAmount * sale.commissionRate / 100);
            total += commission;
            if (sale.status !== 'paid') {
                owed += commission;
            }
            
            const month = new Date(sale.saleDate.replace(/-/g, '/')).toLocaleString('default', { month: 'short', year: 'numeric' });
            monthly[month] = (monthly[month] || 0) + commission;
            byClient[sale.clientName] = (byClient[sale.clientName] || 0) + commission;
        });
        
        const sortedClients = Object.entries(byClient).sort((a, b) => b[1] - a[1]).slice(0, 5);

        return { totalEarned: total, amountOwed: owed, monthlyCommissions: monthly, clientCommissions: sortedClients };
    }, [sales]);
    
    const chartOptions = React.useMemo(() => {
        const isDark = theme === 'dark';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        const textColor = isDark ? '#E5E7EB' : '#1F2937';

        return {
            responsive: true,
            scales: {
                y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: textColor } },
                x: { grid: { color: gridColor }, ticks: { color: textColor } }
            },
            plugins: {
                legend: { labels: { color: textColor } }
            }
        };
    }, [theme]);

    const lineChartData = {
        labels: Object.keys(monthlyCommissions).reverse(),
        datasets: [{
            label: 'Commission Earned',
            data: Object.values(monthlyCommissions).reverse(),
            fill: true,
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1
        }]
    };

    const barChartData = {
        labels: clientCommissions.map(c => c[0]),
        datasets: [{
            label: 'Commission by Client',
            data: clientCommissions.map(c => c[1]),
            backgroundColor: 'rgba(153, 102, 255, 0.6)',
        }]
    };

    const downloadPdf = async () => {
        if (!jspdfLoaded || !html2canvasLoaded) {
            alert("PDF generation library is still loading. Please try again in a moment.");
            return;
        }
        const { jsPDF } = window.jspdf;
        const html2canvas = window.html2canvas;
        
        const canvas = await html2canvas(reportRef.current);
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF();
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${freelancerInfo.name}_report.pdf`);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString.replace(/-/g, '/'));
        return date.toLocaleDateString();
    };

    return (
        <div className="container mx-auto p-8">
            <header className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Report for {freelancerInfo.name}</h1>
                    <p className="text-gray-600 dark:text-gray-300 mt-1">A summary of your sales and commissions.</p>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="relative">
                        <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                            {notifications.length > 0 && <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-800"></span>}
                        </button>
                        {showNotifications && (
                            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-700 rounded-md shadow-lg overflow-hidden z-20">
                                <div className="py-2">
                                    {notifications.length > 0 ? notifications.map((note, index) => (
                                        <p key={index} className="text-sm px-4 py-2 border-b dark:border-gray-600 text-gray-700 dark:text-gray-200">{note}</p>
                                    )) : <p className="text-sm px-4 py-2 text-gray-700 dark:text-gray-200">No new notifications.</p>}
                                </div>
                            </div>
                        )}
                    </div>
                    <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                        {theme === 'light' ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                        )}
                    </button>
                    <button onClick={downloadPdf} disabled={!jspdfLoaded || !html2canvasLoaded} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-400">
                         {jspdfLoaded && html2canvasLoaded ? 'Download PDF' : 'Loading PDF...'}
                    </button>
                    <button onClick={() => setView('auth')} className="text-sm text-red-500 hover:underline">Logout</button>
                </div>
            </header>
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <KpiCard title="Total Earned" value={`$${totalEarned.toFixed(2)}`} colorClass="text-green-600" />
                <KpiCard title="Amount Owed" value={`$${amountOwed.toFixed(2)}`} colorClass="text-yellow-700" />
            </section>
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Earnings Over Time</h2>
                    <Line options={chartOptions} data={lineChartData} />
                </div>
                <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Performance by Client</h2>
                    <Bar options={{...chartOptions, indexAxis: 'y'}} data={barChartData} />
                </div>
            </section>
             <div id="report-content" ref={reportRef} className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
                 <h2 className="text-xl font-bold text-gray-800 dark:text-white p-6">Transaction Log</h2>
                 <div className="overflow-x-auto">
                    <table className="min-w-full leading-normal">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr className="border-b-2 border-gray-200 dark:border-gray-600 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                <th className="px-5 py-3">Date</th>
                                <th className="px-5 py-3">Video Title</th>
                                <th className="px-5 py-3">Client</th>
                                <th className="px-5 py-3">Your Commission</th>
                                <th className="px-5 py-3">Status</th>
                                <th className="px-5 py-3">Paid On</th>
                            </tr>
                        </thead>
                        <tbody className="dark:text-gray-200">
                            {sales.map(sale => {
                                const commission = (sale.saleAmount * sale.commissionRate / 100);
                                return (
                                    <tr key={sale.id} className={`border-b border-gray-200 dark:border-gray-700 ${sale.status === 'paid' ? 'bg-green-50 dark:bg-green-900/20' : ''}`}>
                                        <td className="px-5 py-5 text-sm">{formatDate(sale.saleDate)}</td>
                                        <td className="px-5 py-5 text-sm">{sale.videoTitle}</td>
                                        <td className="px-5 py-5 text-sm">{sale.clientName}</td>
                                        <td className="px-5 py-5 text-sm font-semibold text-green-700">${commission.toFixed(2)}</td>
                                        <td className="px-5 py-5 text-sm">
                                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${sale.status === 'paid' ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'}`}>
                                                {sale.status || 'unpaid'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-5 text-sm">{formatDate(sale.paidDate)}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const Footer = () => (
    <footer className="text-center py-4 mt-8 text-sm text-gray-500 dark:text-gray-400">
        <p>&copy; {new Date().getFullYear()} AIO FILMZ MEDIA GROUP LLC. All Rights Reserved.</p>
    </footer>
);

export default function App() {
    const [user, setUser] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [view, setView] = React.useState('auth'); // 'auth', 'adminDashboard', 'freelancerReport'
    const [freelancerInfo, setFreelancerInfo] = React.useState(null);
    const [adminUid, setAdminUid] = React.useState(null);
    const [theme, setTheme] = React.useState(localStorage.getItem('theme') || 'light');

    React.useEffect(() => {
        // This effect only runs when the view is NOT the freelancer report
        if (view !== 'freelancerReport') {
            localStorage.setItem('theme', theme);
            if (theme === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        }
    }, [theme, view]);

    React.useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                setView('adminDashboard');
            } else {
                if (view !== 'freelancerReport') {
                    setView('auth');
                }
            }
            setLoading(false);
        });
        return unsubscribe;
    }, [view]);

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">Loading...</div>;
    }

    const renderView = () => {
        switch (view) {
            case 'adminDashboard':
                return user ? <AdminDashboard userId={user.uid} theme={theme} setTheme={setTheme} /> : <AuthPage setView={setView} setFreelancerInfo={setFreelancerInfo} setAdminUid={setAdminUid} />;
            case 'freelancerReport':
                return <FreelancerReport adminUid={adminUid} freelancerInfo={freelancerInfo} setView={setView} />;
            case 'auth':
            default:
                return <AuthPage setView={setView} setFreelancerInfo={setFreelancerInfo} setAdminUid={setAdminUid} />;
        }
    };

    return (
        <div className="bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-inter min-h-screen flex flex-col">
            <div className="flex-grow">
                {renderView()}
            </div>
            <Footer />
        </div>
    );
}

