export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  InteractId: { input: string; output: string; }
};

export type GqlAccountMemberEntry = {
  __typename?: 'AccountMemberEntry';
  accountEmail: Scalars['String']['output'];
  lastSeenAt: Scalars['String']['output'];
  member: GqlMember;
  provider: GqlAccountProvider;
};

export type GqlAccountProvider =
  | 'anthropic'
  | 'openai';

export type GqlAccountShare = {
  __typename?: 'AccountShare';
  expiresAt: Scalars['String']['output'];
  token: Scalars['String']['output'];
};

export type GqlActiveAccountInput = {
  email: Scalars['String']['input'];
  provider: GqlAccountProvider;
};

export type GqlClaimedAccountShare = {
  __typename?: 'ClaimedAccountShare';
  encryptedPayload: Scalars['String']['output'];
  provider: GqlAccountProvider;
};

export type GqlInvite = {
  __typename?: 'Invite';
  acceptedAt?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  email: Scalars['String']['output'];
  id: Scalars['InteractId']['output'];
  role: GqlInviteRole;
};

export type GqlInviteRole =
  | 'dev'
  | 'org_admin';

export type GqlMember = {
  __typename?: 'Member';
  email: Scalars['String']['output'];
  id: Scalars['InteractId']['output'];
  name?: Maybe<Scalars['String']['output']>;
  picture?: Maybe<Scalars['String']['output']>;
  role: GqlUserRole;
};

export type GqlModelPrices = {
  __typename?: 'ModelPrices';
  fetchedAt: Scalars['String']['output'];
  pricesJson: Scalars['String']['output'];
};

export type GqlMutation = {
  __typename?: 'Mutation';
  claimAccountShare?: Maybe<GqlClaimedAccountShare>;
  createAccountShare: GqlAccountShare;
  createOrganization: GqlOrganization;
  inviteMember: GqlInvite;
  recordPromptIdle: GqlPromptMutationResult;
  recordPromptStart: GqlPromptStartResult;
  recordQuestionsAnswered: GqlQuestionAnsweredResult;
  removeMember: Scalars['Boolean']['output'];
  reportActiveAccounts: GqlReportActiveAccountsResult;
  reportSessionUsage: GqlPromptMutationResult;
};


export type GqlMutationClaimAccountShareArgs = {
  token: Scalars['String']['input'];
};


export type GqlMutationCreateAccountShareArgs = {
  encryptedPayload: Scalars['String']['input'];
  provider: GqlAccountProvider;
};


export type GqlMutationCreateOrganizationArgs = {
  name: Scalars['String']['input'];
};


export type GqlMutationInviteMemberArgs = {
  email: Scalars['String']['input'];
  role: GqlInviteRole;
};


export type GqlMutationRecordPromptIdleArgs = {
  input: GqlPromptIdleInput;
};


export type GqlMutationRecordPromptStartArgs = {
  input: GqlPromptStartInput;
};


export type GqlMutationRecordQuestionsAnsweredArgs = {
  input: GqlQuestionAnsweredInput;
};


export type GqlMutationRemoveMemberArgs = {
  userId: Scalars['InteractId']['input'];
};


export type GqlMutationReportActiveAccountsArgs = {
  accounts: Array<GqlActiveAccountInput>;
};


export type GqlMutationReportSessionUsageArgs = {
  input: GqlSessionUsageReportInput;
};

export type GqlOrganization = {
  __typename?: 'Organization';
  forceBoardMode: Scalars['Boolean']['output'];
  id: Scalars['InteractId']['output'];
  name: Scalars['String']['output'];
  recordQuestions: Scalars['Boolean']['output'];
  storePrompts: Scalars['Boolean']['output'];
};

export type GqlPromptIdleInput = {
  cacheReadTokens: Scalars['Int']['input'];
  cacheWriteTokens: Scalars['Int']['input'];
  inputTokens: Scalars['Int']['input'];
  outputTokens: Scalars['Int']['input'];
  promptId: Scalars['InteractId']['input'];
};

export type GqlPromptMutationResult = {
  __typename?: 'PromptMutationResult';
  forceBoardMode: Scalars['Boolean']['output'];
  recordQuestions: Scalars['Boolean']['output'];
  recorded: Scalars['Boolean']['output'];
  storePrompts: Scalars['Boolean']['output'];
};

export type GqlPromptStartInput = {
  accountEmail?: InputMaybe<Scalars['String']['input']>;
  accountProvider?: InputMaybe<Scalars['String']['input']>;
  connectionProjects?: InputMaybe<Scalars['String']['input']>;
  contextLength?: InputMaybe<Scalars['Int']['input']>;
  gitRemoteUrl?: InputMaybe<Scalars['String']['input']>;
  handoffSessionId?: InputMaybe<Scalars['String']['input']>;
  isGoalPrompt?: InputMaybe<Scalars['Boolean']['input']>;
  loggedAt?: InputMaybe<Scalars['String']['input']>;
  mode?: InputMaybe<Scalars['String']['input']>;
  modelId?: InputMaybe<Scalars['String']['input']>;
  modelProviderId?: InputMaybe<Scalars['String']['input']>;
  modelVariant?: InputMaybe<Scalars['String']['input']>;
  projectName?: InputMaybe<Scalars['String']['input']>;
  projectPath?: InputMaybe<Scalars['String']['input']>;
  prompt: Scalars['String']['input'];
  providerId?: InputMaybe<Scalars['String']['input']>;
  sessionId: Scalars['String']['input'];
  source?: InputMaybe<Scalars['String']['input']>;
  worktreeBranch?: InputMaybe<Scalars['String']['input']>;
  worktreeId?: InputMaybe<Scalars['String']['input']>;
  worktreePath?: InputMaybe<Scalars['String']['input']>;
};

export type GqlPromptStartResult = {
  __typename?: 'PromptStartResult';
  forceBoardMode: Scalars['Boolean']['output'];
  promptId?: Maybe<Scalars['InteractId']['output']>;
  recordQuestions: Scalars['Boolean']['output'];
  recorded: Scalars['Boolean']['output'];
  storePrompts: Scalars['Boolean']['output'];
};

export type GqlQuery = {
  __typename?: 'Query';
  listAccountMembers: Array<GqlAccountMemberEntry>;
  listInvites: Array<GqlInvite>;
  listMembers: Array<GqlMember>;
  listOrganizations: Array<GqlOrganization>;
  listUsers: Array<GqlMember>;
  me?: Maybe<GqlUser>;
  modelPrices?: Maybe<GqlModelPrices>;
};


export type GqlQueryListInvitesArgs = {
  orgId?: InputMaybe<Scalars['InteractId']['input']>;
};


export type GqlQueryListMembersArgs = {
  orgId?: InputMaybe<Scalars['InteractId']['input']>;
};

export type GqlQuestionAnsweredInput = {
  loggedAt?: InputMaybe<Scalars['String']['input']>;
  projectName?: InputMaybe<Scalars['String']['input']>;
  questionCount: Scalars['Int']['input'];
  sessionId: Scalars['String']['input'];
};

export type GqlQuestionAnsweredResult = {
  __typename?: 'QuestionAnsweredResult';
  forceBoardMode: Scalars['Boolean']['output'];
  recordQuestions: Scalars['Boolean']['output'];
  recorded: Scalars['Boolean']['output'];
  storePrompts: Scalars['Boolean']['output'];
};

export type GqlReportActiveAccountsResult = {
  __typename?: 'ReportActiveAccountsResult';
  forceBoardMode: Scalars['Boolean']['output'];
  recordQuestions: Scalars['Boolean']['output'];
  recorded: Scalars['Boolean']['output'];
  storePrompts: Scalars['Boolean']['output'];
};

export type GqlSessionUsageReportInput = {
  agentSdk?: InputMaybe<Scalars['String']['input']>;
  buckets: Array<GqlUsageBucketInput>;
  gitRemoteUrl?: InputMaybe<Scalars['String']['input']>;
  mode?: InputMaybe<Scalars['String']['input']>;
  projectName?: InputMaybe<Scalars['String']['input']>;
  projectPath?: InputMaybe<Scalars['String']['input']>;
  provider: Scalars['String']['input'];
  sessionId: Scalars['String']['input'];
  worktreeBranch?: InputMaybe<Scalars['String']['input']>;
};

export type GqlUsageBucketInput = {
  bucketTs: Scalars['String']['input'];
  cacheReadTokens: Scalars['Int']['input'];
  cacheWriteTokens: Scalars['Int']['input'];
  costUsd: Scalars['Float']['input'];
  inputTokens: Scalars['Int']['input'];
  model: Scalars['String']['input'];
  outputTokens: Scalars['Int']['input'];
};

export type GqlUser = {
  __typename?: 'User';
  email: Scalars['String']['output'];
  id: Scalars['InteractId']['output'];
  name?: Maybe<Scalars['String']['output']>;
  organization?: Maybe<GqlOrganization>;
  picture?: Maybe<Scalars['String']['output']>;
  role: GqlUserRole;
};

export type GqlUserRole =
  | 'dev'
  | 'org_admin'
  | 'super_admin';

export type GqlHiveEnterpriseMeQueryVariables = Exact<{ [key: string]: never; }>;


export type GqlHiveEnterpriseMeQuery = (
  { __typename?: 'Query' }
  & { me?: Maybe<(
    { __typename?: 'User' }
    & Pick<GqlUser, 'id' | 'email' | 'role'>
    & { organization?: Maybe<(
      { __typename?: 'Organization' }
      & Pick<
        GqlOrganization,
        | 'id'
        | 'name'
        | 'storePrompts'
        | 'recordQuestions'
        | 'forceBoardMode'
      >
    )> }
  )> }
);

export type GqlHiveEnterpriseRecordPromptStartMutationVariables = Exact<{
  input: GqlPromptStartInput;
}>;


export type GqlHiveEnterpriseRecordPromptStartMutation = (
  { __typename?: 'Mutation' }
  & { recordPromptStart: (
    { __typename?: 'PromptStartResult' }
    & Pick<
      GqlPromptStartResult,
      | 'recorded'
      | 'promptId'
      | 'storePrompts'
      | 'recordQuestions'
      | 'forceBoardMode'
    >
  ) }
);

export type GqlHiveEnterpriseRecordPromptIdleMutationVariables = Exact<{
  input: GqlPromptIdleInput;
}>;


export type GqlHiveEnterpriseRecordPromptIdleMutation = (
  { __typename?: 'Mutation' }
  & { recordPromptIdle: (
    { __typename?: 'PromptMutationResult' }
    & Pick<
      GqlPromptMutationResult,
      | 'recorded'
      | 'storePrompts'
      | 'recordQuestions'
      | 'forceBoardMode'
    >
  ) }
);

export type GqlHiveEnterpriseRecordQuestionsAnsweredMutationVariables = Exact<{
  input: GqlQuestionAnsweredInput;
}>;


export type GqlHiveEnterpriseRecordQuestionsAnsweredMutation = (
  { __typename?: 'Mutation' }
  & { recordQuestionsAnswered: (
    { __typename?: 'QuestionAnsweredResult' }
    & Pick<
      GqlQuestionAnsweredResult,
      | 'recorded'
      | 'storePrompts'
      | 'recordQuestions'
      | 'forceBoardMode'
    >
  ) }
);

export type GqlHiveEnterpriseReportActiveAccountsMutationVariables = Exact<{
  accounts: Array<GqlActiveAccountInput> | GqlActiveAccountInput;
}>;


export type GqlHiveEnterpriseReportActiveAccountsMutation = (
  { __typename?: 'Mutation' }
  & { reportActiveAccounts: (
    { __typename?: 'ReportActiveAccountsResult' }
    & Pick<
      GqlReportActiveAccountsResult,
      | 'recorded'
      | 'storePrompts'
      | 'recordQuestions'
      | 'forceBoardMode'
    >
  ) }
);

export type GqlHiveEnterpriseCreateAccountShareMutationVariables = Exact<{
  provider: GqlAccountProvider;
  encryptedPayload: Scalars['String']['input'];
}>;


export type GqlHiveEnterpriseCreateAccountShareMutation = (
  { __typename?: 'Mutation' }
  & { createAccountShare: (
    { __typename?: 'AccountShare' }
    & Pick<GqlAccountShare, 'token' | 'expiresAt'>
  ) }
);

export type GqlHiveEnterpriseListAccountMembersQueryVariables = Exact<{ [key: string]: never; }>;


export type GqlHiveEnterpriseListAccountMembersQuery = (
  { __typename?: 'Query' }
  & { listAccountMembers: Array<(
    { __typename?: 'AccountMemberEntry' }
    & Pick<GqlAccountMemberEntry, 'provider' | 'accountEmail' | 'lastSeenAt'>
    & { member: (
      { __typename?: 'Member' }
      & Pick<
        GqlMember,
        | 'id'
        | 'email'
        | 'name'
        | 'picture'
      >
    ) }
  )> }
);
