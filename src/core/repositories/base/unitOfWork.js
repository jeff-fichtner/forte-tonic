/**
 * Unit of Work Pattern - coordinates repository operations and transactions
 * Provides centralized access to all repositories and handles cross-cutting concerns
 */

import { StudentRepository } from '../studentRepository.js';
import { AdminRepository } from '../adminRepository.js';
import { InstructorRepository } from '../instructorRepository.js';
import { ParentRepository } from '../parentRepository.js';

export class UnitOfWork {
    constructor(dbClient) {
        this.dbClient = dbClient;
        this._repositories = new Map();
        this._isDisposed = false;
    }

    /**
     * Gets or creates the student repository
     */
    get students() {
        return this._getRepository('students', () => new StudentRepository(this.dbClient));
    }

    /**
     * Gets or creates the admin repository
     */
    get admins() {
        return this._getRepository('admins', () => new AdminRepository(this.dbClient));
    }

    /**
     * Gets or creates the instructor repository
     */
    get instructors() {
        return this._getRepository('instructors', () => new InstructorRepository(this.dbClient));
    }

    /**
     * Gets or creates the parent repository
     */
    get parents() {
        return this._getRepository('parents', () => new ParentRepository(this.dbClient));
    }

    /**
     * Private method to get or create repositories
     */
    _getRepository(key, factory) {
        if (this._isDisposed) {
            throw new Error('UnitOfWork has been disposed');
        }

        if (!this._repositories.has(key)) {
            this._repositories.set(key, factory());
        }
        return this._repositories.get(key);
    }

    /**
     * Clears all repository caches
     */
    clearAllCaches() {
        this._repositories.forEach(repository => {
            if (repository.clearCache) {
                repository.clearCache();
            }
        });
    }

    /**
     * Forces refresh of all data
     */
    async refreshAll() {
        const promises = Array.from(this._repositories.values()).map(repository => {
            if (repository.findAll) {
                return repository.findAll({}, true); // Force refresh
            }
            return Promise.resolve();
        });

        await Promise.all(promises);
    }

    /**
     * Gets health status of all repositories
     */
    async getHealthStatus() {
        const status = {
            healthy: true,
            repositories: {},
            timestamp: new Date().toISOString()
        };

        try {
            // Test each repository
            const tests = [
                { name: 'students', test: () => this.students.count() },
                { name: 'admins', test: () => this.admins.count() },
                { name: 'instructors', test: () => this.instructors.count() },
                { name: 'parents', test: () => this.parents.count() }
            ];

            for (const { name, test } of tests) {
                try {
                    const count = await test();
                    status.repositories[name] = {
                        healthy: true,
                        recordCount: count,
                        lastChecked: new Date().toISOString()
                    };
                } catch (error) {
                    status.healthy = false;
                    status.repositories[name] = {
                        healthy: false,
                        error: error.message,
                        lastChecked: new Date().toISOString()
                    };
                }
            }
        } catch (error) {
            status.healthy = false;
            status.error = error.message;
        }

        return status;
    }

    /**
     * Disposes of the unit of work and cleans up resources
     */
    dispose() {
        this._repositories.clear();
        this._isDisposed = true;
    }

    /**
     * Cross-repository operations that require coordination
     */

    /**
     * Gets a user (admin or instructor) by email across both repositories
     */
    async findUserByEmail(email) {
        const [admin, instructor] = await Promise.all([
            this.admins.findByEmail(email),
            this.instructors.findByEmail(email)
        ]);

        if (admin) return { type: 'admin', user: admin };
        if (instructor) return { type: 'instructor', user: instructor };
        return null;
    }

    /**
     * Gets full family information (student + parents)
     */
    async getFamilyInfo(studentId) {
        const student = await this.students.findById(studentId);
        if (!student) return null;

        const parents = [];
        if (student.parent1Id) {
            const parent1 = await this.parents.findById(student.parent1Id);
            if (parent1) parents.push(parent1);
        }
        if (student.parent2Id) {
            const parent2 = await this.parents.findById(student.parent2Id);
            if (parent2) parents.push(parent2);
        }

        return {
            student,
            parents
        };
    }

    /**
     * Finds available instructors for a student based on grade and scheduling
     */
    async findAvailableInstructors(studentId, instrument = null, day = null) {
        const student = await this.students.findById(studentId);
        if (!student) return [];

        const criteria = {
            gradeLevel: student.grade,
            activeOnly: true
        };

        if (instrument) criteria.instrument = instrument;
        if (day) criteria.day = day;

        return await this.instructors.findMatching(criteria);
    }

    /**
     * Gets comprehensive dashboard data
     */
    async getDashboardData() {
        const [
            totalStudents,
            activeStudents,
            totalInstructors,
            activeInstructors,
            totalParents,
            totalAdmins
        ] = await Promise.all([
            this.students.count(),
            this.students.count({ isActive: true }),
            this.instructors.count(),
            this.instructors.findActive().then(result => result.length),
            this.parents.count(),
            this.admins.count()
        ]);

        return {
            students: {
                total: totalStudents,
                active: activeStudents,
                inactive: totalStudents - activeStudents
            },
            instructors: {
                total: totalInstructors,
                active: activeInstructors,
                inactive: totalInstructors - activeInstructors
            },
            parents: {
                total: totalParents
            },
            admins: {
                total: totalAdmins
            },
            timestamp: new Date().toISOString()
        };
    }
}
