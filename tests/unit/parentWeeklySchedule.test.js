describe('Parent Weekly Schedule Logic', () => {
  let mockParentUser;
  let mockStudents;
  let mockRegistrations;

  beforeEach(() => {
    // Create mock parent user
    mockParentUser = {
      parent: { id: 'parent123' },
    };

    // Create mock students
    mockStudents = [
      {
        id: 'student1',
        firstName: 'Alice',
        lastName: 'Smith',
        parent1Id: 'parent123', // Child of current parent
        parent2Id: null,
      },
      {
        id: 'student2',
        firstName: 'Bob',
        lastName: 'Jones',
        parent1Id: 'other-parent',
        parent2Id: null, // Not child of current parent
      },
      {
        id: 'student3',
        firstName: 'Charlie',
        lastName: 'Brown',
        parent1Id: 'other-parent',
        parent2Id: 'parent123', // Child of current parent (via parent2)
      },
    ];

    // Create mock registrations
    mockRegistrations = [
      {
        id: 'reg1',
        studentId: { value: 'student1' },
        instructorId: { value: 'instructor1' },
        student: mockStudents[0], // Alice - should be shown
      },
      {
        id: 'reg2',
        studentId: { value: 'student2' },
        instructorId: { value: 'instructor1' },
        student: mockStudents[1], // Bob - should NOT be shown
      },
      {
        id: 'reg3',
        studentId: { value: 'student3' },
        instructorId: { value: 'instructor1' },
        student: mockStudents[2], // Charlie - should be shown
      },
    ];
  });

  test("should filter registrations to show only parent's children", () => {
    // Arrange
    const currentParentId = mockParentUser.parent?.id;

    // Act - Filter registrations like the implementation does
    const parentChildRegistrations = mockRegistrations.filter(registration => {
      const student = registration.student;
      if (!student) return false;

      // Check if the current parent is either parent1 or parent2 of the student
      return student.parent1Id === currentParentId || student.parent2Id === currentParentId;
    });

    // Get unique students
    const studentsWithRegistrations = parentChildRegistrations
      .map(registration => registration.student)
      .filter(student => student && student.id)
      .filter((student, index, self) => self.findIndex(s => s.id === student.id) === index);

    // Assert
    expect(parentChildRegistrations.length).toBe(2); // Alice and Charlie's registrations
    expect(studentsWithRegistrations.length).toBe(2); // Alice and Charlie

    const studentNames = studentsWithRegistrations.map(s => `${s.firstName} ${s.lastName}`);
    expect(studentNames).toContain('Alice Smith');
    expect(studentNames).toContain('Charlie Brown');
    expect(studentNames).not.toContain('Bob Jones');
  });

  test('should return empty array when parent has no children with registrations', () => {
    // Arrange - Create registrations for students that aren't the parent's children
    const registrationsWithoutParentChildren = [
      {
        id: 'reg2',
        studentId: { value: 'student2' },
        instructorId: { value: 'instructor1' },
        student: mockStudents[1], // Bob - not parent's child
      },
    ];

    const currentParentId = mockParentUser.parent?.id;

    // Act
    const parentChildRegistrations = registrationsWithoutParentChildren.filter(registration => {
      const student = registration.student;
      if (!student) return false;

      return student.parent1Id === currentParentId || student.parent2Id === currentParentId;
    });

    const studentsWithRegistrations = parentChildRegistrations
      .map(registration => registration.student)
      .filter(student => student && student.id)
      .filter((student, index, self) => self.findIndex(s => s.id === student.id) === index);

    // Assert
    expect(parentChildRegistrations.length).toBe(0);
    expect(studentsWithRegistrations.length).toBe(0);
  });

  test('should handle parent with no parent ID gracefully', () => {
    // Arrange - Create parent user without parent ID
    const parentUserWithoutId = {
      parent: null,
    };

    const currentParentId = parentUserWithoutId.parent?.id;

    // Act
    expect(currentParentId).toBeUndefined();

    // The filter would return empty array
    const parentChildRegistrations = mockRegistrations.filter(registration => {
      const student = registration.student;
      if (!student) return false;

      return student.parent1Id === currentParentId || student.parent2Id === currentParentId;
    });

    // Assert
    expect(parentChildRegistrations.length).toBe(0);
  });

  test('should handle student with parent2Id as current parent', () => {
    // Arrange - Test Charlie who has the current parent as parent2
    const currentParentId = 'parent123';

    // Act
    const charlieRegistration = mockRegistrations.find(reg => reg.student.firstName === 'Charlie');
    const isCharliesParent =
      charlieRegistration.student.parent1Id === currentParentId ||
      charlieRegistration.student.parent2Id === currentParentId;

    // Assert
    expect(isCharliesParent).toBe(true);
    expect(charlieRegistration.student.parent1Id).toBe('other-parent');
    expect(charlieRegistration.student.parent2Id).toBe('parent123');
  });
});
