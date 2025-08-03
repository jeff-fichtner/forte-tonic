/**
 * Master Schedule Table - Handles registration and attendance with round-trip pattern
 */

class MasterScheduleTable {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.tempIdCounter = 0;
    }

    /**
     * Save registration with round-trip pattern
     */
    async saveRegistration(registrationData) {
        const tempId = `temp-reg-${++this.tempIdCounter}`;
        
        try {
            // 1. Show optimistic UI with loading state
            this.addTemporaryRow(tempId, registrationData);
            this.showSaveIndicator(tempId);
            
            // 2. POST to new repository-based endpoint
            const response = await fetch('/api/registrations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId: registrationData.studentId,
                    instructorId: registrationData.instructorId,
                    classId: registrationData.classId,
                    registrationType: registrationData.registrationType,
                    schoolYear: registrationData.schoolYear || '2025-2026',
                    trimester: registrationData.trimester || 'Fall',
                    className: registrationData.className
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Save failed');
            }
            
            // 3. ✅ Get back REAL object with proper ID
            const result = await response.json();
            const savedRegistration = result.data;
            
            // 4. 🔄 Update UI with real data
            this.updateRowWithRealData(tempId, savedRegistration);
            this.showSaveSuccess(savedRegistration.id);
            
            console.log('✅ Registration saved:', savedRegistration);
            return savedRegistration;
            
        } catch (error) {
            // 5. ❌ Revert on failure
            this.showSaveError(tempId, error.message);
            console.error('❌ Registration save failed:', error);
            throw error;
        }
    }

    /**
     * Mark attendance with round-trip pattern
     */
    async markAttendance(registrationId, week) {
        try {
            // 1. Optimistic UI update
            this.markAttendanceOptimistic(registrationId, week);
            
            // 2. Save to server
            const response = await fetch('/api/attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    registrationId: registrationId,
                    week: week,
                    schoolYear: '2025-2026',
                    trimester: 'Fall'
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Attendance save failed');
            }
            
            // 3. ✅ Confirm with real attendance record
            const result = await response.json();
            const savedAttendance = result.data;
            
            this.confirmAttendance(registrationId, week, savedAttendance);
            console.log('✅ Attendance recorded:', savedAttendance);
            
        } catch (error) {
            // 4. ❌ Revert optimistic update
            this.revertAttendanceOptimistic(registrationId, week);
            console.error('❌ Attendance save failed:', error);
            throw error;
        }
    }

    /**
     * Get attendance summary for a registration
     */
    async getAttendanceSummary(registrationId) {
        try {
            const response = await fetch(`/api/attendance/summary/${registrationId}?schoolYear=2025-2026&trimester=Fall`);
            
            if (!response.ok) {
                throw new Error('Failed to get attendance summary');
            }
            
            const result = await response.json();
            return result.data;
            
        } catch (error) {
            console.error('❌ Failed to get attendance summary:', error);
            throw error;
        }
    }

    // === UI Update Methods ===

    addTemporaryRow(tempId, data) {
        const row = document.createElement('tr');
        row.dataset.tempId = tempId;
        row.classList.add('temporary', 'saving');
        
        row.innerHTML = `
            <td>${data.studentName || 'Loading...'}</td>
            <td>${data.className || data.instructorName || 'Loading...'}</td>
            <td>${data.registrationType}</td>
            <td class="save-status">Saving...</td>
            <td>
                <button class="mark-attendance" disabled>Mark Attendance</button>
            </td>
        `;
        
        this.container.querySelector('tbody').appendChild(row);
    }

    updateRowWithRealData(tempId, realData) {
        const row = this.container.querySelector(`[data-temp-id="${tempId}"]`);
        if (!row) return;
        
        // Update with real data
        row.dataset.registrationId = realData.id;
        row.querySelector('td:nth-child(1)').textContent = realData.studentName || realData.studentId;
        row.querySelector('td:nth-child(2)').textContent = realData.className || realData.instructorName;
        
        // Enable attendance button
        const attendanceBtn = row.querySelector('.mark-attendance');
        attendanceBtn.disabled = false;
        attendanceBtn.dataset.registrationId = realData.id;
        attendanceBtn.onclick = () => this.markAttendance(realData.id, this.getCurrentWeek());
        
        // Remove temporary styling
        row.classList.remove('saving', 'temporary');
        row.classList.add('saved');
        row.removeAttribute('data-temp-id');
    }

    showSaveIndicator(tempId) {
        const row = this.container.querySelector(`[data-temp-id="${tempId}"]`);
        if (row) {
            row.querySelector('.save-status').innerHTML = '🔄 Saving...';
        }
    }

    showSaveSuccess(registrationId) {
        const row = this.container.querySelector(`[data-registration-id="${registrationId}"]`);
        if (row) {
            row.querySelector('.save-status').innerHTML = '✅ Saved';
            setTimeout(() => {
                row.querySelector('.save-status').innerHTML = '';
            }, 2000);
        }
    }

    showSaveError(tempId, errorMessage) {
        const row = this.container.querySelector(`[data-temp-id="${tempId}"]`);
        if (row) {
            row.querySelector('.save-status').innerHTML = `❌ ${errorMessage}`;
            row.classList.add('error');
        }
    }

    markAttendanceOptimistic(registrationId, week) {
        const row = this.container.querySelector(`[data-registration-id="${registrationId}"]`);
        if (row) {
            const attendanceIndicator = row.querySelector('.attendance-indicator') || 
                this.createAttendanceIndicator(row);
            attendanceIndicator.classList.add('present', 'saving');
            attendanceIndicator.textContent = '🔄';
        }
    }

    confirmAttendance(registrationId, week, attendanceData) {
        const row = this.container.querySelector(`[data-registration-id="${registrationId}"]`);
        if (row) {
            const attendanceIndicator = row.querySelector('.attendance-indicator');
            if (attendanceIndicator) {
                attendanceIndicator.classList.remove('saving');
                attendanceIndicator.classList.add('confirmed');
                attendanceIndicator.textContent = '✅';
                attendanceIndicator.dataset.attendanceId = attendanceData.id;
            }
        }
    }

    revertAttendanceOptimistic(registrationId, week) {
        const row = this.container.querySelector(`[data-registration-id="${registrationId}"]`);
        if (row) {
            const attendanceIndicator = row.querySelector('.attendance-indicator');
            if (attendanceIndicator) {
                attendanceIndicator.classList.remove('present', 'saving', 'confirmed');
                attendanceIndicator.textContent = '❌';
                setTimeout(() => {
                    attendanceIndicator.textContent = '';
                }, 2000);
            }
        }
    }

    createAttendanceIndicator(row) {
        const indicator = document.createElement('span');
        indicator.className = 'attendance-indicator';
        row.querySelector('td:last-child').appendChild(indicator);
        return indicator;
    }

    getCurrentWeek() {
        // Calculate current week of school year
        const startOfSchoolYear = new Date('2025-08-15'); // Adjust as needed
        const today = new Date();
        const diffTime = Math.abs(today - startOfSchoolYear);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.ceil(diffDays / 7);
    }
}

// Usage example:
// const scheduleTable = new MasterScheduleTable('schedule-table');
// 
// // Save a new registration
// scheduleTable.saveRegistration({
//     studentId: 'student123',
//     classId: 'class456',
//     registrationType: 'GROUP',
//     className: 'Piano Ensemble'
// });
// 
// // Mark attendance
// scheduleTable.markAttendance('student123_class456', 5);
