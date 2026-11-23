const bridge = window.freightPilotDesktop;

const STEP_DEFINITIONS = [
  {
    key: 'createdAccount',
    title: 'Create your company workspace',
    description: 'Create an owner account with your company email domain and verify credentials are shared with the launch lead.',
    outcome: 'Owner workspace created and ready for operator invitations.',
    actions: ['openSignup', 'markComplete'],
  },
  {
    key: 'connectedConsole',
    title: 'Validate control tower connectivity',
    description: 'Run a connectivity test to confirm the ops console URL responds from this desktop environment.',
    outcome: 'Dispatch workstation can reliably access the control tower URL.',
    actions: ['testConsole', 'markComplete'],
  },
  {
    key: 'invitedTeam',
    title: 'Assign operators and playbook ownership',
    description: 'Confirm role ownership and invite the first wave of operators and dispatchers into the workspace.',
    outcome: 'Named ownership for dispatch, data integrity, and security response.',
    actions: ['openDocs', 'markComplete'],
  },
  {
    key: 'importedData',
    title: 'Run data rehearsal and dry dispatch',
    description: 'Import warehouse, fleet, and order data, then perform one dry-run optimization cycle before live dispatch.',
    outcome: 'Baseline data quality and route optimization flow validated.',
    actions: ['openDocs', 'launchConsole', 'markComplete'],
  },
  {
    key: 'launchedLive',
    title: 'Launch live operations',
    description: 'Open the control tower and run your first live dispatch window with role owners monitoring outcomes.',
    outcome: 'Production launch complete with readiness score and role sign-off captured.',
    actions: ['launchConsole', 'markComplete'],
  },
];

const elements = {
  opsUrl: document.getElementById('opsUrl'),
  signupUrl: document.getElementById('signupUrl'),
  docsUrl: document.getElementById('docsUrl'),
  saveBtn: document.getElementById('saveBtn'),
  testBtn: document.getElementById('testBtn'),
  launchBtn: document.getElementById('launchBtn'),
  status: document.getElementById('status'),
  progressBar: document.getElementById('progressBar'),
  progressLabel: document.getElementById('progressLabel'),
  progressTrack: document.getElementById('progressTrack'),
  wizardSteps: document.getElementById('wizardSteps'),
  stepStage: document.getElementById('stepStage'),
  stepTitle: document.getElementById('stepTitle'),
  stepDescription: document.getElementById('stepDescription'),
  stepOutcome: document.getElementById('stepOutcome'),
  stepActions: document.getElementById('stepActions'),
  prevStepBtn: document.getElementById('prevStepBtn'),
  nextStepBtn: document.getElementById('nextStepBtn'),
  milestoneList: document.getElementById('milestoneList'),
  openSignup: document.getElementById('openSignup'),
  openDocs: document.getElementById('openDocs'),
  readinessBar: document.getElementById('readinessBar'),
  readinessMeter: document.getElementById('readinessMeter'),
  readinessScore: document.getElementById('readinessScore'),
  readinessLabel: document.getElementById('readinessLabel'),
  readinessRisks: document.getElementById('readinessRisks'),
  roleDispatcher: document.getElementById('roleDispatcher'),
  roleData: document.getElementById('roleData'),
  roleSecurity: document.getElementById('roleSecurity'),
  celebrationBanner: document.getElementById('celebrationBanner'),
};

const onboardingDefaults = {
  createdAccount: false,
  connectedConsole: false,
  invitedTeam: false,
  importedData: false,
  launchedLive: false,
  roleDispatcherReady: false,
  roleDataReady: false,
  roleSecurityReady: false,
  activeStep: 0,
};

let config = null;
let onboarding = { ...onboardingDefaults };

function setStatus(message, type) {
  elements.status.textContent = message;
  elements.status.classList.remove('ok', 'warn');
  if (type) {
    elements.status.classList.add(type);
  }
}

function coerceOnboarding(raw) {
  const merged = {
    ...onboardingDefaults,
    ...(raw || {}),
  };

  const maxStep = STEP_DEFINITIONS.length - 1;
  const activeStep = Number.isInteger(merged.activeStep) ? merged.activeStep : 0;

  return {
    ...merged,
    roleDispatcherReady: Boolean(merged.roleDispatcherReady),
    roleDataReady: Boolean(merged.roleDataReady),
    roleSecurityReady: Boolean(merged.roleSecurityReady),
    activeStep: Math.min(Math.max(activeStep, 0), maxStep),
  };
}

function buildOnboardingPayload() {
  return {
    ...onboarding,
    activeStep: onboarding.activeStep,
  };
}

function completedCount() {
  return STEP_DEFINITIONS.filter((step) => onboarding[step.key]).length;
}

function validHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function computeReadiness() {
  const totalSteps = STEP_DEFINITIONS.length;
  const completedSteps = completedCount();
  const completedRatio = totalSteps === 0 ? 0 : completedSteps / totalSteps;

  const rolesDone = [onboarding.roleDispatcherReady, onboarding.roleDataReady, onboarding.roleSecurityReady].filter(Boolean).length;
  const roleRatio = rolesDone / 3;

  const validUrls = [elements.opsUrl.value, elements.signupUrl.value, elements.docsUrl.value].filter(validHttpUrl).length;
  const urlRatio = validUrls / 3;

  const score = Math.round(completedRatio * 70 + roleRatio * 20 + urlRatio * 10);

  const risks = [];
  if (!onboarding.connectedConsole) {
    risks.push('Console connectivity has not been verified yet.');
  }
  if (rolesDone < 3) {
    risks.push('Not all rollout owners are assigned.');
  }
  if (validUrls < 3) {
    risks.push('One or more setup URLs are invalid or missing.');
  }
  if (!onboarding.launchedLive) {
    risks.push('Live launch milestone is still pending.');
  }

  let label = 'Setup in progress';
  if (score >= 85) {
    label = 'Launch-ready';
  } else if (score >= 60) {
    label = 'Almost ready';
  }

  return { score, label, risks };
}

function renderReadiness() {
  const readiness = computeReadiness();
  elements.readinessScore.textContent = String(readiness.score);
  elements.readinessLabel.textContent = readiness.label;
  elements.readinessBar.style.width = `${readiness.score}%`;
  elements.readinessMeter.setAttribute('aria-valuenow', String(readiness.score));

        elements.readinessRisks.replaceChildren();
  if (readiness.risks.length === 0) {
    const item = document.createElement('li');
    item.className = 'risk-item ok';
    item.textContent = 'No launch blockers detected.';
    elements.readinessRisks.appendChild(item);
    return;
  }

  readiness.risks.forEach((risk) => {
    const item = document.createElement('li');
    item.className = 'risk-item';
    item.textContent = risk;
    elements.readinessRisks.appendChild(item);
  });
}

function applyProgress() {
  const completed = completedCount();
  const total = STEP_DEFINITIONS.length;
  const pct = Math.round((completed / total) * 100);

  elements.progressBar.style.width = `${pct}%`;
  elements.progressLabel.textContent = `${completed} / ${total} complete`;
  elements.progressTrack.setAttribute('aria-valuenow', String(pct));
  renderReadiness();

  // Show celebration banner when all steps are done
  if (completed === total) {
    elements.celebrationBanner.classList.remove('hidden');
  } else {
    elements.celebrationBanner.classList.add('hidden');
  }
}

function isStepBlocked(index) {
  if (index === 0) {
    return false;
  }

  for (let i = 0; i < index; i += 1) {
    if (!onboarding[STEP_DEFINITIONS[i].key]) {
      return true;
    }
  }

  return false;
}

function renderWizardSteps() {
        elements.wizardSteps.replaceChildren();

  STEP_DEFINITIONS.forEach((step, index) => {
    const item = document.createElement('li');
    const stepBtn = document.createElement('button');
    const blocked = isStepBlocked(index);
    const status = onboarding[step.key] ? 'Done' : blocked ? 'Blocked' : index === onboarding.activeStep ? 'In progress' : 'Pending';

    stepBtn.type = 'button';
    stepBtn.className = `wizard-step ${onboarding[step.key] ? 'done' : ''} ${index === onboarding.activeStep ? 'active' : ''} ${blocked ? 'blocked' : ''}`;
    stepBtn.disabled = blocked;
          const stepIndex = document.createElement('span');
          stepIndex.className = 'step-index';
          stepIndex.textContent = String(index + 1);
          const stepCopy = document.createElement('span');
          stepCopy.className = 'step-copy';
          const stepTitle = document.createElement('span');
          stepTitle.textContent = step.title;
          const stepStatus = document.createElement('small');
          stepStatus.textContent = status;
          stepCopy.append(stepTitle, stepStatus);
          stepBtn.append(stepIndex, stepCopy);
    stepBtn.addEventListener('click', () => {
      onboarding.activeStep = index;
      renderWizard();
      persistConfig({ showMessage: false }).catch(() => {
        setStatus('Could not persist step selection.', 'warn');
      });
    });

    item.appendChild(stepBtn);
    elements.wizardSteps.appendChild(item);
  });
}

function renderMilestones() {
        elements.milestoneList.replaceChildren();

  STEP_DEFINITIONS.forEach((step) => {
    const row = document.createElement('li');
    row.className = onboarding[step.key] ? 'milestone done' : 'milestone';
    row.textContent = `${onboarding[step.key] ? 'Completed' : 'Pending'}: ${step.title}`;
    elements.milestoneList.appendChild(row);
  });
}

function markStepComplete(stepKey, completed) {
  onboarding[stepKey] = completed;
  applyProgress();
  renderWizardSteps();
  renderMilestones();
  return persistConfig({ showMessage: false });
}

async function runConsoleConnectivityTest() {
  await persistConfig({ showMessage: false });
  setStatus('Testing connection...', null);
  const result = await bridge.testConsole(elements.opsUrl.value.trim());
  setStatus(result.message, result.ok ? 'ok' : 'warn');

  if (result.ok) {
    await markStepComplete('connectedConsole', true);
  }

  return result.ok;
}

function createActionButton(label, className, handler) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  button.addEventListener('click', () => {
    Promise.resolve(handler()).catch((error) => {
      setStatus(error instanceof Error ? error.message : 'Action failed.', 'warn');
    });
  });
  return button;
}

function renderStepDetail() {
  const step = STEP_DEFINITIONS[onboarding.activeStep];
  elements.stepStage.textContent = `Setup ${onboarding.activeStep + 1} of ${STEP_DEFINITIONS.length}`;
  elements.stepTitle.textContent = step.title;
  elements.stepDescription.textContent = step.description;
  elements.stepOutcome.textContent = `Success outcome: ${step.outcome}`;
        elements.stepActions.replaceChildren();

  if (step.actions.includes('openSignup')) {
    elements.stepActions.appendChild(
      createActionButton('Open signup page', 'btn-secondary', async () => {
        await persistConfig({ showMessage: false });
        await bridge.openExternal(elements.signupUrl.value.trim());
        setStatus('Opened signup page in browser.', 'ok');
      }),
    );
  }

  if (step.actions.includes('openDocs')) {
    elements.stepActions.appendChild(
      createActionButton('Open docs', 'btn-secondary', async () => {
        await persistConfig({ showMessage: false });
        await bridge.openExternal(elements.docsUrl.value.trim());
        setStatus('Opened docs in browser.', 'ok');
      }),
    );
  }

  if (step.actions.includes('testConsole')) {
    elements.stepActions.appendChild(
      createActionButton('Run console test', 'btn-accent', async () => {
        await runConsoleConnectivityTest();
      }),
    );
  }

  if (step.actions.includes('launchConsole')) {
    elements.stepActions.appendChild(
      createActionButton('Launch control tower', 'btn-accent', async () => {
        await persistConfig({ showMessage: false });
        await bridge.launchConsole(elements.opsUrl.value.trim());
        setStatus('Control tower opened in a new window.', 'ok');

        if (step.key === 'launchedLive' && !onboarding.launchedLive) {
          await markStepComplete('launchedLive', true);
        }
      }),
    );
  }

  if (step.actions.includes('markComplete')) {
    const markLabel = onboarding[step.key] ? 'Mark as incomplete' : 'Mark step complete';
    elements.stepActions.appendChild(
      createActionButton(markLabel, 'btn-primary', async () => {
        await markStepComplete(step.key, !onboarding[step.key]);
        renderStepDetail();
      }),
    );
  }

  elements.prevStepBtn.disabled = onboarding.activeStep === 0;
  elements.nextStepBtn.disabled =
    onboarding.activeStep >= STEP_DEFINITIONS.length - 1 || !onboarding[STEP_DEFINITIONS[onboarding.activeStep].key];
}

function renderWizard() {
  applyProgress();
  renderWizardSteps();
  renderMilestones();
  renderStepDetail();
}

function loadUiFromConfig() {
  elements.opsUrl.value = config.opsConsoleUrl || '';
  elements.signupUrl.value = config.productSignupUrl || '';
  elements.docsUrl.value = config.docsUrl || '';
  onboarding = coerceOnboarding(config.onboarding);
  elements.roleDispatcher.checked = onboarding.roleDispatcherReady;
  elements.roleData.checked = onboarding.roleDataReady;
  elements.roleSecurity.checked = onboarding.roleSecurityReady;
  renderWizard();
}

async function persistConfig({ showMessage = true } = {}) {
  const partial = {
    opsConsoleUrl: elements.opsUrl.value.trim(),
    productSignupUrl: elements.signupUrl.value.trim(),
    docsUrl: elements.docsUrl.value.trim(),
    onboarding: buildOnboardingPayload(),
  };

  config = await bridge.saveConfig(partial);
  onboarding = coerceOnboarding(config.onboarding);

  if (showMessage) {
    setStatus('Setup saved successfully.', 'ok');
  }
}

async function initialize() {
  config = await bridge.getConfig();
  loadUiFromConfig();

  elements.saveBtn.addEventListener('click', async () => {
    try {
      await persistConfig();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not save setup.', 'warn');
    }
  });

  elements.testBtn.addEventListener('click', async () => {
    try {
      await runConsoleConnectivityTest();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Connection test failed.', 'warn');
    }
  });

  elements.launchBtn.addEventListener('click', async () => {
    try {
      await persistConfig({ showMessage: false });
      await bridge.launchConsole(elements.opsUrl.value.trim());
      if (!onboarding.launchedLive) {
        await markStepComplete('launchedLive', true);
      }
      setStatus('Control tower opened in a new window.', 'ok');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not open control tower.', 'warn');
    }
  });

  elements.openSignup.addEventListener('click', async (event) => {
    event.preventDefault();
    try {
      await persistConfig({ showMessage: false });
      await bridge.openExternal(elements.signupUrl.value.trim());
      setStatus('Opened company signup in your browser.', 'ok');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not open signup URL.', 'warn');
    }
  });

  elements.openDocs.addEventListener('click', async (event) => {
    event.preventDefault();
    try {
      await persistConfig({ showMessage: false });
      await bridge.openExternal(elements.docsUrl.value.trim());
      setStatus('Opened documentation in your browser.', 'ok');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not open docs URL.', 'warn');
    }
  });

  elements.prevStepBtn.addEventListener('click', async () => {
    if (onboarding.activeStep === 0) {
      return;
    }

    onboarding.activeStep -= 1;
    renderWizard();
    await persistConfig({ showMessage: false });
  });

  elements.nextStepBtn.addEventListener('click', async () => {
    const currentStep = STEP_DEFINITIONS[onboarding.activeStep];
    if (!onboarding[currentStep.key]) {
      setStatus('Complete this milestone before moving to the next step.', 'warn');
      return;
    }

    if (onboarding.activeStep >= STEP_DEFINITIONS.length - 1) {
      return;
    }

    onboarding.activeStep += 1;
    renderWizard();
    await persistConfig({ showMessage: false });
  });

  const roleInputs = [elements.roleDispatcher, elements.roleData, elements.roleSecurity];
  roleInputs.forEach((input) => {
    input.addEventListener('change', async () => {
      onboarding.roleDispatcherReady = elements.roleDispatcher.checked;
      onboarding.roleDataReady = elements.roleData.checked;
      onboarding.roleSecurityReady = elements.roleSecurity.checked;
      renderReadiness();
      await persistConfig({ showMessage: false });
    });
  });

  [elements.opsUrl, elements.signupUrl, elements.docsUrl].forEach((input) => {
    input.addEventListener('input', () => {
      renderReadiness();
    });
  });
}

initialize().catch((error) => {
  setStatus(error instanceof Error ? error.message : 'Could not initialize setup.', 'warn');
});
