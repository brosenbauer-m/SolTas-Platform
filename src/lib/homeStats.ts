export type HomeStats = {
  updated_at: string;
  projects: {
    projects_registered?: number;
    projects_approved?: number;
    projects_ongoing?: number;
    organisations_registered?: number;
    /** people who own or created a published project or issue, or belong to a verified organisation */
    changemakers?: number;
    /** self-reported "lives improved" of published community projects */
    lives_improved?: number;
    donations_received_eur?: number;
  };
  funding: {
    opportunities_total?: number;
    funders_registered?: number;
    committed_eur?: number;
    open_calls?: number;
  };
  issues: {
    issues_total?: number;
    issues_open?: number;
    issues_verified?: number;
    issues_resolved?: number;
  };
};
