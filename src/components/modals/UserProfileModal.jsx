import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ProfileCard from '../profile/ProfileCard';

const UserProfileModal = ({ isOpen, onClose, viewingUser, currentUser, onAddFriend, onMessage, onProfileUpdate }) => {
    return (
        <AnimatePresence>
            {isOpen && viewingUser && (
                <>
                    {/* BACKDROP */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                        onClick={onClose}
                    >
                        {/* MODAL CONTAINER */}
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="w-full max-w-md relative"
                            onClick={(e) => e.stopPropagation()} // Prevent closing on content click
                        >
                            <ProfileCard
                                user={viewingUser}
                                currentUser={currentUser}
                                onClose={onClose}
                                isSelf={currentUser?.id && viewingUser?.id === currentUser.id}
                                onAddFriend={onAddFriend}
                                onMessage={onMessage}
                                onProfileUpdate={onProfileUpdate}
                            />
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default UserProfileModal;
