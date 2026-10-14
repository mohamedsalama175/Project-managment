import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore } from '../../stores/useProjectStore';

describe('useProjectStore - Single Source of Truth User Synchronization', () => {
  beforeEach(() => {
    useProjectStore.setState({
      teamMembers: [
        {
          id: 'member-ahmed-khalil',
          name: 'Ahmed Khalil',
          email: 'ahmed.khalil@deliverops.local',
          jobTitle: 'Lead Engineer',
          department: 'Engineering',
          systemRole: 'project_manager',
          weeklyCapacityHours: 40,
          status: 'active',
          color: '#1f8a70',
          createdAt: '2026-09-01T08:00:00Z',
        },
      ],
    });
  });

  it('preserves backend ID when adding a team member with an explicit ID', () => {
    const backendId = 'user-backend-ulid-12345';
    const id = useProjectStore.getState().addTeamMember({
      id: backendId,
      name: 'Salama QA',
      email: 'salama.qa@deliverops.local',
      jobTitle: 'QA Lead',
      department: 'Quality',
      systemRole: 'contributor',
      weeklyCapacityHours: 35,
      status: 'active',
      color: '#10b981',
    });

    expect(id).toBe(backendId);
    const member = useProjectStore.getState().teamMembers.find((m) => m.id === backendId);
    expect(member).toBeDefined();
    expect(member?.name).toBe('Salama QA');
    expect(member?.weeklyCapacityHours).toBe(35);
  });

  it('synchronizes backend users, updating existing members by email and preserving backend ID', () => {
    const apiUsers = [
      {
        id: 'user-backend-ahmed-id',
        name: 'Ahmed Khalil Updated',
        email: 'ahmed.khalil@deliverops.local',
        jobTitle: 'Principal Solutions Architect',
        department: 'Architecture',
        weeklyCapacityHours: 30,
        roles: ['admin'],
        status: 'active' as const,
        avatarUrl: 'https://example.com/avatar.jpg',
      },
      {
        id: 'user-backend-newbie',
        name: 'New Engineer',
        email: 'newbie@deliverops.local',
        jobTitle: 'Junior Developer',
        department: 'Engineering',
        weeklyCapacityHours: 40,
        roles: ['contributor'],
        status: 'active' as const,
      },
    ];

    useProjectStore.getState().syncTeamMembersFromBackend(apiUsers);

    const members = useProjectStore.getState().teamMembers;
    expect(members).toHaveLength(2);

    const updatedAhmed = members.find((m) => m.email === 'ahmed.khalil@deliverops.local');
    expect(updatedAhmed).toBeDefined();
    expect(updatedAhmed?.id).toBe('user-backend-ahmed-id');
    expect(updatedAhmed?.name).toBe('Ahmed Khalil Updated');
    expect(updatedAhmed?.jobTitle).toBe('Principal Solutions Architect');
    expect(updatedAhmed?.weeklyCapacityHours).toBe(30);
    expect(updatedAhmed?.photoUrl).toBe('https://example.com/avatar.jpg');

    const newMember = members.find((m) => m.id === 'user-backend-newbie');
    expect(newMember).toBeDefined();
    expect(newMember?.name).toBe('New Engineer');
    expect(newMember?.weeklyCapacityHours).toBe(40);
  });

  it('updates member status to inactive when backend user is inactive', () => {
    const apiUsers = [
      {
        id: 'member-ahmed-khalil',
        name: 'Ahmed Khalil',
        email: 'ahmed.khalil@deliverops.local',
        status: 'inactive' as const,
        is_active: false,
      },
    ];

    useProjectStore.getState().syncTeamMembersFromBackend(apiUsers);

    const ahmed = useProjectStore.getState().teamMembers.find((m) => m.id === 'member-ahmed-khalil');
    expect(ahmed?.status).toBe('inactive');
  });
});
