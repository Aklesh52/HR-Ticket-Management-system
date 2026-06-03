export const ROLE_MATRIX = {
  RL5: {
    label: 'Manager (RL5)',
    required: [
      { department: 'IT', items: ['Laptop', 'Access'], tatDays: 3 },
      { department: 'Admin', items: ['Diary', 'Pen', 'Stationery'], tatDays: 1 },
    ],
  },
  RL1: {
    label: 'Intern (RL1)',
    required: [
      { department: 'IT', items: ['Access'], tatDays: 2 },
      { department: 'Admin', items: ['Stationery'], tatDays: 1 },
    ],
  },
}
