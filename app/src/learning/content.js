// Reviewed teaching content, recovered from the existing site and corrected September 2026.
const BASE_LOGIC_PROBLEMS = [
  // ── EASY
  {
    id: 1, difficulty: "easy",
    title: "The Classic Syllogism",
    argument: [
      "P1: All humans are mortal.",
      "P2: Socrates is a human.",
      "C:  Therefore, Socrates is mortal.",
    ],
    question: "Is this argument valid? Is it sound? Explain the difference and apply it to this argument.",
    hint: "Validity asks: if the premises were true, must the conclusion be true? Soundness asks: are the premises actually true AND is the argument valid?",
    solution: `This argument is both valid and sound.\n\nValidity: An argument is valid if, assuming all premises are true, the conclusion must follow necessarily. If all humans are mortal (P1) and Socrates is human (P2), then Socrates must be mortal. The conclusion cannot be false while the premises are true — so the argument is valid.\n\nSoundness: An argument is sound if it is valid AND all its premises are actually true. P1 is true (all humans die) and P2 is true (Socrates was a human). So this argument is sound.\n\nKey distinction: validity concerns logical form only; soundness demands both valid form and true premises. An argument can be valid without being sound, but cannot be sound without being valid.`,
  },
  {
    id: 2, difficulty: "easy",
    title: "Affirming the Consequent",
    argument: [
      "P1: If it is raining, then the ground is wet.",
      "P2: The ground is wet.",
      "C:  Therefore, it is raining.",
    ],
    question: "Is this argument valid? If not, name the fallacy and explain why the reasoning fails.",
    hint: "Could the ground be wet for a reason other than rain? If yes, does P2 guarantee the conclusion?",
    solution: `This argument is invalid. It commits the fallacy of affirming the consequent.\n\nThe form is: If P → Q; Q is true; therefore P is true. This does not follow. The ground being wet is consistent with many explanations — a sprinkler, a burst pipe, spilled water. Rain is not the only cause.\n\nContrast with the four classical forms:\n• Modus Ponens (valid): P → Q; P; ∴ Q\n• Modus Tollens (valid): P → Q; ¬Q; ∴ ¬P\n• Affirming the Consequent (INVALID): P → Q; Q; ∴ P\n• Denying the Antecedent (INVALID): P → Q; ¬P; ∴ ¬Q\n\nAffirming the consequent confuses a sufficient condition with a necessary one. Rain is sufficient to make the ground wet, but it is not necessary.`,
  },
  {
    id: 3, difficulty: "easy",
    title: "Valid but Unsound",
    argument: [
      "P1: All cats are reptiles.",
      "P2: Whiskers is a cat.",
      "C:  Therefore, Whiskers is a reptile.",
    ],
    question: "Is this argument valid? Is it sound? Use this example to explain why validity alone is not enough.",
    hint: "Treat the premises as assumptions and ask: does the conclusion follow? Then ask separately: are the premises true?",
    solution: `This argument is valid but unsound.\n\nValidity: If we assume P1 and P2 are true (even though they may not be), the conclusion follows necessarily. The form — All A are B; X is A; therefore X is B — is a valid syllogistic pattern (Barbara).\n\nSoundness: P1 is false. Cats are mammals, not reptiles. Because at least one premise is false, the argument fails the soundness test.\n\nThis example reveals something important: validity is purely formal — it says nothing about whether the premises reflect reality. A logically valid argument can have false premises and a false conclusion. Soundness is the higher standard, requiring both a valid form and premises that are actually true.`,
  },
  {
    id: 4, difficulty: "easy",
    title: "Modus Tollens",
    argument: [
      "P1: If a figure is a triangle, then it has exactly three sides.",
      "P2: This figure does not have exactly three sides.",
      "C:  Therefore, this figure is not a triangle.",
    ],
    question: "Name this argument form and assess whether it is valid. How does it differ from affirming the consequent?",
    hint: "If P is sufficient for Q, and Q is absent, what does that tell us about P?",
    solution: `This is Modus Tollens (Latin: 'mode of denying') and it is valid.\n\nForm: If P → Q; ¬Q; therefore ¬P.\n\nReasoning: having three sides is a necessary consequence of being a triangle. If something lacks that necessary feature, it cannot be a triangle. The inference is airtight.\n\nCompared to affirming the consequent (P → Q; Q; ∴ P — invalid), Modus Tollens runs in the correct logical direction: it uses the absence of the consequent to deny the antecedent, which is sound because the conditional says Q must accompany P — so if Q is absent, P cannot be present.\n\nThe four classical forms again:\n• Modus Ponens: P → Q; P; ∴ Q ✓\n• Modus Tollens: P → Q; ¬Q; ∴ ¬P ✓\n• Affirming the Consequent: P → Q; Q; ∴ P ✗\n• Denying the Antecedent: P → Q; ¬P; ∴ ¬Q ✗`,
  },
  {
    id: 5, difficulty: "easy",
    title: "Denying the Antecedent",
    argument: [
      "P1: If you study hard, you will pass the exam.",
      "P2: You did not study hard.",
      "C:  Therefore, you will not pass the exam.",
    ],
    question: "Is this argument valid? Name the fallacy if invalid, and construct a counterexample to prove your point.",
    hint: "Is studying hard the only way to pass? If you can imagine someone who did not study but still passed, what does that show?",
    solution: `This argument is invalid. It commits the fallacy of denying the antecedent.\n\nForm: If P → Q; ¬P; therefore ¬Q. This does not follow. P1 says studying hard is sufficient for passing — it does not say it is the only way to pass. A student might pass through prior knowledge, a lenient examiner, or exceptional natural ability.\n\nCounterexample: Suppose a student does not study at all, but the exam covers material they already knew from outside school. P1 and P2 are both true, yet the student passes — so the conclusion is false. This demonstrates the argument form is invalid.\n\nThe fallacy treats a sufficient condition as if it were a necessary one. 'If you study → you pass' is not equivalent to 'if you don't study → you don't pass.'`,
  },

  // ── MODERATE
  {
    id: 6, difficulty: "moderate",
    title: "Chained Syllogism",
    argument: [
      "P1: All philosophers are critical thinkers.",
      "P2: All critical thinkers question assumptions.",
      "P3: Plato is a philosopher.",
      "C:  Therefore, Plato questions assumptions.",
    ],
    question: "Is this argument valid? Reconstruct the inferential steps explicitly. Is it likely sound?",
    hint: "Try drawing an intermediate conclusion from two of the premises first, then use it with the third.",
    solution: `This argument is valid. It is a chained syllogism — sometimes called 'Barbara' in its extended form.\n\nStep 1: From P1 (All philosophers are critical thinkers) + P3 (Plato is a philosopher) → Intermediate: Plato is a critical thinker. [Valid: All A are B; X is A; ∴ X is B]\n\nStep 2: From Intermediate (Plato is a critical thinker) + P2 (All critical thinkers question assumptions) → Conclusion: Plato questions assumptions. [Same valid form]\n\nChaining valid inferences produces a valid argument. Each step preserves truth: if the premises were all true, the conclusion cannot be false.\n\nSoundness: P1 is a plausible generalisation; P2 is arguably definitionally true; P3 is historically true. The argument is plausibly sound, though P1 and P2 are broad generalisations that could be challenged.`,
  },
  {
    id: 7, difficulty: "moderate",
    title: "Presence and Guilt",
    argument: [
      "P1: If the defendant was at the crime scene, then he is guilty.",
      "P2: The defendant was at the crime scene.",
      "C:  Therefore, the defendant is guilty.",
    ],
    question: "Is this argument valid? Is it sound? Pay particular attention to the truth of P1 and what it assumes about the relationship between presence and guilt.",
    hint: "The logical form may be impeccable — but is P1 actually a true statement? Think about witnesses, emergency responders, or bystanders.",
    solution: "The argument is valid by modus ponens: P → Q; P; therefore Q. Its soundness is not established by the information given.\n\nP1 treats this defendant's presence as sufficient for guilt. That connection needs independent justification. A witness, responder, or bystander can be present without being responsible for the crime. This illustrates why presence alone is not a general sufficient condition for guilt.\n\nFor this particular defendant, the example does not supply evidence establishing guilt or innocence. We should therefore distinguish an unsupported premise from one we have proved false. If both P1 and P2 are true, this valid argument is sound; if either is false, it is unsound.\n\nThe useful lesson is to test the logical form and the grounds for the premises separately. A correct inference cannot establish its own starting assumptions.",
  },
  {
    id: 8, difficulty: "moderate",
    title: "Circular Reasoning",
    argument: [
      "P1: The Bible is the word of God.",
      "P2: We know P1 is true because the Bible itself says so.",
      "C:  Therefore, whatever the Bible says is true.",
    ],
    question: "Identify any missing premise. What makes this reasoning circular as a justification? Distinguish formal validity, soundness, and an independent reason to accept the conclusion.",
    hint: "To move from 'the word of God' to 'whatever it says is true', what must be assumed about God's truthfulness? Does using the Bible's own claim establish that assumption or its authority?",
    solution: "This example concerns circular justification, but its logical reconstruction matters.\n\nAs written, the move from the Bible being God's word to everything it says being true requires an additional premise about God's truthfulness and the accuracy of that text. Make that premise explicit before claiming formal validity. Once the bridging premise is supplied, the conclusion follows from it and P1; P2 is offered as a justification for P1 rather than a new independent bridge.\n\nThe proposed justification is circular if the Bible's own claim is accepted as decisive evidence of its authority only because its statements are already assumed to be true. It then supplies no independent reason for someone who questions that authority.\n\nA clean comparison is: 'This statement is true; therefore this statement is true.' The form P; therefore P is valid. It is sound if P is true, although repeating P gives a doubter no independent support for it. Soundness means validity plus true premises; it does not include a separate requirement that premises be independently established.\n\nKeep three questions separate: Does the conclusion follow? Are the premises true? Do the offered reasons justify accepting those premises?",
    sources: [{"label":"Open Logic, The scope of logic: sound arguments","url":"https://forallx.openlogicproject.org/bookml/Ch2.html"}],
    checklist: ["I identified the unstated bridging premise.","I distinguished soundness from independent justification.","I explained where the justification becomes circular."],
  },
  {
    id: 9, difficulty: "moderate",
    title: "False Dilemma",
    argument: [
      "P1: Either you support this environmental policy or you do not care about the environment.",
      "P2: You do not support this policy.",
      "C:  Therefore, you do not care about the environment.",
    ],
    question: "Is this argument formally valid? Even if valid, what is logically wrong with it? Name the fallacy and explain how to identify it.",
    hint: "Are those genuinely the only two options in P1? What happens to a valid argument when one of its premises is false?",
    solution: "The argument is formally valid as a disjunctive syllogism: A ∨ B; not-A; therefore B. If both P1 and P2 are true, the argument is sound.\n\nThe concern is a possible false dilemma in P1. It treats support for this policy and lack of concern for the environment as exhaustive alternatives. A person could reject the policy because they favour another approach, think it ineffective, or believe it damages the environment. Such a case makes both alternatives in P1 false.\n\nThat possible case shows why P1 needs a defence. The problem supplies no facts about a particular person's motives, so it does not itself establish whether this instance of P1 is true or false. Do not confuse a valid argument with an established sound argument.\n\nTo test a false dilemma, ask whether the alternatives genuinely exhaust the possibilities. A counterexample challenges the premise rather than the validity of disjunctive syllogism.",
  },

  // ── HARD
  {
    id: 10, difficulty: "hard",
    title: "The Sorites Paradox",
    argument: [
      "P1: A person with 0 hairs on their head is bald.",
      "P2: If a person with n hairs is bald, then a person with n+1 hairs is also bald.",
      "C:  Therefore, a person with 100,000 hairs on their head is bald.",
    ],
    question: "Is this argument valid? The conclusion seems absurd, yet both premises seem intuitively reasonable. What does this paradox reveal about logic and the limits of language?",
    hint: "Assume the tolerance premise applies at every step from 0 to 99,999 hairs. Repeated modus ponens then produces the conclusion. Different theories of vagueness explain what to reject in different ways.",
    solution: "Under a classical reading, the argument is valid: the first premise gives the starting case, and the second, understood universally over the relevant numbers, lets us apply modus ponens repeatedly until we reach 100,000 hairs. This finite chain does not need a separate induction axiom.\n\nThe conclusion conflicts with ordinary use, although each one-hair change seems too small to matter. This tension is the sorites paradox. Under classical bivalence, accepting the starting case and rejecting the conclusion means rejecting the unrestricted tolerance premise P2. Explaining how and why it fails is the difficult part.\n\nSeveral responses compete:\n• Epistemicism: there is a sharp boundary, but we cannot know its exact location.\n• Supervaluationism: borderline statements can lack a definite truth value. A statement is supertrue if true under every admissible precise interpretation. Classical validities, including excluded middle, remain supertrue in the basic language; it is incorrect to say classical logic holds only for clear cases.\n• Degree-based approaches: truth can come in degrees, and the behaviour of inference must be specified accordingly.\n• Other non-classical approaches revise logical or semantic assumptions in different ways.\n\nDo not assume at the outset either that a sharp boundary exists or that it cannot exist: that is part of the disagreement. Compare what each view says about P2, the inference, and borderline cases.",
    sources: [{"label":"Kit Fine, Vagueness, Truth and Logic (1975)","url":"https://semantics.uchicago.edu/kennedy/classes/s06/readings/fine75.pdf"}],
    checklist: ["I reconstructed the repeated inference.","I stated which premise or logical assumption is questioned.","I distinguished the competing theories rather than treating one as settled."],
  },
  {
    id: 11, difficulty: "hard",
    title: "Hypothetical Syllogism Chain",
    argument: [
      "P1: If God exists, then objective moral facts exist.",
      "P2: If objective moral facts exist, then moral facts are mind-independent.",
      "P3: If moral facts are mind-independent, then they cannot be known through unaided human reason.",
      "P4: If moral facts cannot be known through unaided human reason, then moral knowledge requires divine revelation.",
      "P5: God exists.",
      "C:  Therefore, moral knowledge requires divine revelation.",
    ],
    question: "Is this argument valid? Then assess the truth or justification of each premise. Which would you challenge, and what would actually count as a counterexample to that conditional?",
    hint: "Chain P1–P4, then apply P5. To refute 'if P then Q', you need P true and Q false; showing Q without P challenges necessity, not sufficiency. Soundness is a property of the whole argument.",
    solution: "The argument is valid. Chain P1–P4 to obtain 'If God exists, then moral knowledge requires divine revelation'; combine this with P5 by modus ponens. That establishes validity without establishing the premises' truth.\n\nP1: Moral realism without God does not refute this premise. It would give objective moral facts without God (Q without P), whereas a counterexample to God → objective moral facts requires God to exist while objective moral facts do not (P and not-Q). Ask what conception of God is assumed and why that existence is sufficient for objective morality. Questions about morality's dependence on God are related but distinct.\n\nP2: Clarify 'objective' and 'mind-independent'. A view might defend impartial rational standards without accepting that they exist independently of all rational agents. Whether this is a counterexample depends on the definitions used.\n\nP3: Why should mind-independence prevent rational knowledge? The proposal needs an argument for that barrier. An analogy with mathematical knowledge can test the inference, although the status of mathematical facts is itself contested.\n\nP4: Excluding unaided reason does not by itself establish revelation as the only route. Ask whether other sources of knowledge are possible, and whether there could instead be no moral knowledge. A causal explanation of moral beliefs is not automatically a justification of them.\n\nP5: God's existence requires independent defence.\n\nConclusion: the chain is valid, but its soundness has not been established. Challenge a particular premise with a relevant reason, rather than treating disagreement as proof that the premise is false.",
    sources: [{"label":"Open Logic, Connectives: the conditional","url":"https://forallx.openlogicproject.org/bookml/Ch5.html"}],
    checklist: ["I reconstructed the conditional chain.","My counterexample has an antecedent that is true and consequent that is false.","I assessed the premises' truth separately from the argument's validity."],
  },
  {
    id: 12, difficulty: "hard",
    title: "The Illicit Major Fallacy",
    argument: ["P1: All pleasures are good things.","P2: No instances of knowledge are pleasures.","C: Therefore, no instances of knowledge are good things."],
    question: "Is this argument formally valid? If not, identify the specific formal fallacy, explain why the inference fails, and construct a counterexample using different terms to prove invalidity.",
    hint: "What does 'All A are B' actually tell you about things that are not A? Does it say they cannot also be B? Try replacing A and B with categories where you know the truth values independently.",
    solution: "This argument is invalid. In its displayed categorical form it commits the illicit major fallacy.\n\nWrite its structure as: All M are P; no S are M; therefore no S are P. 'Good things' is the major term P, because it is the predicate of the conclusion. The conclusion speaks about all good things when it excludes knowledge from that whole class. The first premise only places pleasures inside that class; it does not speak about all good things. The major term is therefore distributed in the conclusion but not in its premise.\n\nIt is not an undistributed-middle error: the middle term 'pleasures' is distributed as the subject of the first premise. Nor is it illicit minor: the minor term is already distributed in the second premise.\n\nCounterexample with the same form:\n• All dogs are animals. (True.)\n• No cats are dogs. (True.)\n• Therefore, no cats are animals. (False.)\n\nTrue premises and a false conclusion in this example prove the form invalid. Being outside a subset does not establish being outside the larger set. In the related individual conditional reconstruction, this resembles denying the antecedent: P → Q; not-P; therefore not-Q.\n\nWhether knowledge or pleasure is actually good is a separate ethical question; no answer to it can repair this invalid inference.",
    sources: [{"label":"David Naugle, Categorical syllogisms: illicit major","url":"https://www3.dbu.edu/naugle/pdf/2302_handouts/categorical_syllogisms.pdf"}],
    checklist: ["I identified the major term in the conclusion.","I explained its illicit distribution.","I gave a counterexample with true premises and a false conclusion."],
  },
];

const BASE_FLASHCARDS = [
  // --- KANTIANISM ---
  { id: 1, concept: "The Good Will", definition: "The only thing good without qualification; an intention to act from duty, independent of consequences.", thinker: "Kant", tag: "kantianism" },
  { id: 2, concept: "Duty vs. Inclination", definition: "An action has moral worth only if done from duty, not from personal desire, self-interest, or sympathy.", thinker: "Kant", tag: "kantianism" },
  { id: 3, concept: "The Categorical Imperative", definition: "A universal, unconditional moral law derived from reason, binding all rational beings regardless of desire.", thinker: "Kant", tag: "kantianism" },
  { id: 4, concept: "Formula of Universal Law", definition: "'Act only according to that maxim whereby you can, at the same time, will that it should become a universal law.'", thinker: "Kant", tag: "kantianism" },
  { id: 5, concept: "Formula of Humanity", definition: "'Treat humanity never merely as a means to an end, but always at the same time as an end.'", thinker: "Kant", tag: "kantianism" },
  { id: 6, concept: "Kingdom of Ends", definition: "An ideal moral community where every rational being legislates and is bound by universal moral laws.", thinker: "Kant", tag: "kantianism" },
  { id: 7, concept: "Autonomy & Freedom", definition: "Moral agency requires self-legislation — obeying laws we give ourselves through reason, not external coercion.", thinker: "Kant", tag: "kantianism" },
  { id: 8, concept: "Perfect vs. Imperfect Duties", definition: "Perfect duties admit no exception (e.g., never lie); imperfect duties allow latitude (e.g., help others sometimes).", thinker: "Kant", tag: "kantianism" },
  { id: 9, concept: "Hypothetical vs. Categorical Imperatives", definition: "Hypothetical imperatives are conditional on desires; categorical imperatives are binding absolutely through reason alone.", thinker: "Kant", tag: "kantianism" },
  { id: 10, concept: "Maxims", definition: "Subjective principles of action; the 'rule' on which one acts, which must be universalisable to be moral.", thinker: "Kant", tag: "kantianism" },

  // --- UTILITARIANISM ---
  { id: 11, concept: "Psychological Hedonism", definition: "The descriptive claim that humans are naturally motivated to seek pleasure and avoid pain.", thinker: "Bentham / Mill", tag: "utilitarianism" },
  { id: 12, concept: "Ethical Hedonism", definition: "The normative claim that pleasure is the only intrinsic good and pain the only intrinsic evil.", thinker: "Bentham / Mill", tag: "utilitarianism" },
  { id: 13, concept: "Felicific Calculus", definition: "Bentham's method for measuring pleasure/pain via intensity, duration, certainty, propinquity, fecundity, purity, extent.", thinker: "Bentham", tag: "utilitarianism" },
  { id: 14, concept: "Higher vs. Lower Pleasures", definition: "Mill's distinction between intellectual/moral pleasures (higher) and bodily pleasures (lower), with qualitative priority.", thinker: "Mill", tag: "utilitarianism" },
  { id: 15, concept: "Secondary Principles", definition: "Everyday moral rules (don't lie, don't steal) that generally maximise utility, used in practice instead of direct calculation.", thinker: "Mill", tag: "utilitarianism" },
  { id: 16, concept: "Act Utilitarianism", definition: "Each action is judged by whether it produces the greatest overall happiness in that specific situation.", thinker: "Bentham", tag: "utilitarianism" },
  { id: 17, concept: "Rule Utilitarianism", definition: "Actions are right if they conform to rules whose general acceptance maximises overall utility.", thinker: "Mill (interp.)", tag: "utilitarianism" },
  { id: 18, concept: "Preference Utilitarianism", definition: "Maximising the satisfaction of preferences rather than hedonic pleasure; identified with Singer and Hare.", thinker: "Singer", tag: "utilitarianism" },
  { id: 19, concept: "Equal Consideration of Interests", definition: "Every being's interests count equally in the moral calculation, regardless of identity or species.", thinker: "Singer", tag: "utilitarianism" },
  { id: 20, concept: "Internal vs. External Sanctions", definition: "Internal = conscience/guilt; External = social or legal consequences that motivate utilitarian behaviour.", thinker: "Mill", tag: "utilitarianism" },

  // --- OBJECTIONS TO UTILITARIANISM ---
  { id: 21, concept: "Integrity Objection", definition: "Utilitarianism may require agents to violate their own deeply held projects and values to maximise utility.", thinker: "Williams", tag: "objection-util" },
  { id: 22, concept: "Tyranny of the Majority", definition: "Aggregating pleasure can justify serious harms to minorities if it benefits the majority.", thinker: "Rawls / Critics", tag: "objection-util" },
  { id: 23, concept: "Experience Machine", definition: "A thought experiment suggesting pleasure alone is not the sole good — we value reality, authenticity, and action.", thinker: "Nozick", tag: "objection-util" },
  { id: 24, concept: "Anscombe's Epistemic Objection", definition: "We cannot reliably predict all consequences, so consequentialist decisions are epistemically unjustified.", thinker: "Anscombe", tag: "objection-util" },
  { id: 25, concept: "Demandingness Objection", definition: "Utilitarianism demands we constantly sacrifice our own interests for the greater good, leaving no room for personal life.", thinker: "Critics", tag: "objection-util" },

  // --- OBJECTIONS TO KANTIANISM ---
  { id: 26, concept: "Rigidity / Inflexibility", definition: "Kant's absolute rules (e.g., 'never lie') can produce morally monstrous outcomes — e.g., the 'murderer at the door' case.", thinker: "Constant / Critics", tag: "objection-kant" },
  { id: 27, concept: "Moral Motivation Problem", definition: "Kant devalues sympathy and love — yet these seem morally important motivators rather than mere inclinations.", thinker: "Schiller / Critics", tag: "objection-kant" },
  { id: 28, concept: "Formalism Objection", definition: "The categorical imperative is too abstract to give real moral guidance in complex cases.", thinker: "Hegel", tag: "objection-kant" },
  { id: 29, concept: "Neglect of Consequences", definition: "Kant's ethics ignore outcomes, yet consequences seem morally relevant in many cases.", thinker: "Consequentialists", tag: "objection-kant" },
  { id: 30, concept: "Scope of Rationality", definition: "Kant's reliance on rational agency excludes beings with limited reason (infants, animals) from direct moral consideration.", thinker: "Animal Ethicists", tag: "objection-kant" },
];

const BASE_ESSAY_STEPS = [
  // ── Setup
  { id: "essay_q",        section: "Setup",                   col: "setup",   label: "Essay Question",                         prompt: "Write the full essay question you are planning for.",                                                                   hint: 'e.g. "To what extent is utilitarianism a convincing ethical theory?"' },
  // ── Thesis
  { id: "thesis",         section: "Thesis",                  col: "thesis",  label: "Thesis",                                 prompt: "State the central claim your essay will defend.",                                                                       hint: 'e.g. "I argue that utilitarianism, while compelling in its simplicity, ultimately fails as a complete ethical theory."' },
  // ── Argument 1
  { id: "a1_arg",         section: "Argument 1",              col: "arg",     label: "Argument",                               prompt: "State your first main argument in support of your thesis.",                                                             hint: "This should be a clear, standalone reason why your thesis is true." },
  { id: "a1_reasons",     section: "Argument 1",              col: "arg",     label: "Reasons For",                            prompt: "What reasons justify this argument? List the key sub-claims.",                                                           hint: "Break the argument into its component reasons or premises." },
  { id: "a1_exp_elab_ex",  section: "Argument 1",              col: "arg",     label: "Explanation, Elaboration & Example",     prompt: "In one response: (1) explain how your reasons support the argument, (2) elaborate with philosophical depth or secondary literature, and (3) give a concrete example or thought experiment.",  hint: "Cover all three: the logical connection, a philosopher/theory that deepens the point, and a case study or example." },
  { id: "a1_link",        section: "Argument 1",              col: "arg",     label: "Link to Thesis & Essay Question",         prompt: "Explicitly connect this argument back to your thesis and the essay question.",                                           hint: 'e.g. "This shows that [X], which directly supports my thesis that [p], and addresses the question by demonstrating..."' },
  // ── Counter-Argument 1
  { id: "c1_arg",         section: "Counter-Argument 1",      col: "counter", label: "Counter-Argument",                       prompt: "State the strongest objection to your argument.",                                                                        hint: "Engage with the best version of the opposing view — not a weak one." },
  { id: "c1_targets",     section: "Counter-Argument 1",      col: "counter", label: "Which Reasons Does This Target?",         prompt: "Identify precisely which of your reasons (from Argument 1) this counter-argument attacks.",                              hint: 'e.g. "This objection targets my claim that [reason], by arguing that..."' },
  { id: "c1_exp_elab_ex",  section: "Counter-Argument 1",      col: "counter", label: "Explanation, Elaboration & Counter-Example", prompt: "In one response: (1) explain the counter-argument's internal logic, (2) elaborate by referencing philosophers or theorists who hold this opposing view, and (3) give a counter-example where your argument leads to an unacceptable result.", hint: "Cover all three: the objection's logic, supporting secondary literature, and a concrete counter-example." },
  { id: "c1_link",        section: "Counter-Argument 1",      col: "counter", label: "Link to Potential Counter-Thesis",        prompt: "What alternative thesis would this counter-argument support if it succeeded?",                                            hint: 'e.g. "If this objection succeeds, it would lend support to the view that [alternative]."' },
  // ── Counter-Counter 1
  { id: "cc1_refutation", section: "Counter-Counter Response 1", col: "cc",  label: "Reason for Refuting the Counter-Argument", prompt: "Explain why the counter-argument fails or is less compelling than your argument.",                                        hint: "Show that the objection relies on a false premise, misreads your argument, or that its force is overstated." },
  { id: "cc1_link",       section: "Counter-Counter Response 1", col: "cc",  label: "Link to Thesis",                           prompt: "Reconnect your refutation to your overall thesis.",                                                                       hint: 'e.g. "Having addressed this objection, my thesis that [p] remains intact because..."' },
  { id: "cc1_conclusion", section: "Counter-Counter Response 1", col: "cc",  label: "Overall Conclusion of This Point",         prompt: "Summarise the outcome of this argument → counter-argument → response sequence.",                                           hint: 'e.g. "In sum, while the objection raises a concern, Argument 1 continues to support [p] because..."' },
  // ── Argument 2
  { id: "a2_arg",         section: "Argument 2",              col: "arg",     label: "Argument",                               prompt: "State your second main argument in support of your thesis.",                                                             hint: "This must be a distinct reason from Argument 1." },
  { id: "a2_reasons",     section: "Argument 2",              col: "arg",     label: "Reasons For",                            prompt: "What reasons justify this argument? List the key sub-claims.",                                                           hint: "Break the argument into its component reasons or premises." },
  { id: "a2_exp_elab_ex",  section: "Argument 2",              col: "arg",     label: "Explanation, Elaboration & Example",     prompt: "In one response: (1) explain how your reasons support the argument, (2) elaborate with philosophical depth or secondary literature, and (3) give a concrete example or thought experiment.",  hint: "Cover all three: the logical connection, a philosopher/theory that deepens the point, and a case study or example." },
  { id: "a2_link",        section: "Argument 2",              col: "arg",     label: "Link to Thesis & Essay Question",         prompt: "Explicitly connect this argument back to your thesis and the essay question.",                                           hint: 'e.g. "This further supports my thesis that [p]..."' },
  // ── Counter-Argument 2
  { id: "c2_arg",         section: "Counter-Argument 2",      col: "counter", label: "Counter-Argument",                       prompt: "State the strongest objection to your second argument.",                                                                  hint: "This should be a different objection from Counter-Argument 1." },
  { id: "c2_targets",     section: "Counter-Argument 2",      col: "counter", label: "Which Reasons Does This Target?",         prompt: "Identify precisely which of your reasons (from Argument 2) this counter-argument attacks.",                              hint: "Be precise about which sub-claim is being challenged." },
  { id: "c2_exp_elab_ex",  section: "Counter-Argument 2",      col: "counter", label: "Explanation, Elaboration & Counter-Example", prompt: "In one response: (1) explain the counter-argument's internal logic, (2) elaborate by referencing philosophers or theorists who hold this opposing view, and (3) give a counter-example where your argument leads to an unacceptable result.", hint: "Cover all three: the objection's logic, supporting secondary literature, and a concrete counter-example." },
  { id: "c2_link",        section: "Counter-Argument 2",      col: "counter", label: "Link to Potential Counter-Thesis",        prompt: "What alternative thesis would this counter-argument support if it succeeded?",                                            hint: 'e.g. "If this objection succeeds, it would lend support to the view that [alternative]."' },
  // ── Counter-Counter 2
  { id: "cc2_refutation", section: "Counter-Counter Response 2", col: "cc",  label: "Reason for Refuting the Counter-Argument", prompt: "Explain why this counter-argument fails or is less compelling than your argument.",                                        hint: "Show that the objection relies on a false premise, misreads your argument, or that its force is overstated." },
  { id: "cc2_link",       section: "Counter-Counter Response 2", col: "cc",  label: "Link to Thesis",                           prompt: "Reconnect your refutation to your overall thesis.",                                                                       hint: 'e.g. "Having addressed this second objection, my thesis is further strengthened because..."' },
  { id: "cc2_conclusion", section: "Counter-Counter Response 2", col: "cc",  label: "Overall Conclusion of This Point",         prompt: "Summarise the outcome of this argument → counter-argument → response sequence.",                                           hint: 'e.g. "In sum, Argument 2 provides additional support for [p] because..."' },
];

const LOGIC_SOURCE = {label: "Open Logic: validity and soundness", url: "https://forallx.openlogicproject.org/bookml/Ch2.html"};
export const LOGIC_PROBLEMS = BASE_LOGIC_PROBLEMS.map(problem => ({
  ...problem,
  sources: problem.sources || [LOGIC_SOURCE],
  checklist: problem.checklist || [
    "I distinguished validity from the truth of the premises.",
    "I explained the inference, rather than only naming it.",
    "I supplied a counterexample if invalid, or a derivation if valid."
  ]
}));
export const FLASHCARDS = BASE_FLASHCARDS.map(card => card.id === 24 ? {
  ...card,
  concept: "Anscombe: Intention and Injustice",
  definition: "Anscombe challenges treating intended and merely foreseen consequences alike, and rejects justifying deliberate punishment of the innocent by beneficial outcomes. This is more specific than a general worry about predicting consequences.",
  sources: [{label: "Anscombe, Modern Moral Philosophy (1958), pp. 11–12, 16–17", url: "https://www.cambridge.org/core/services/aop-cambridge-core/content/view/S0031819100037943"}]
} : card);
export const ESSAY_STEPS = [
  ...BASE_ESSAY_STEPS.map(step => {
    if (/^cc[12]_refutation$/.test(step.id)) return {...step, section: step.section.replace("Counter-Counter Response", "Evaluation"), label: "Evaluate the objection", prompt: "Does this objection defeat your claim, require a narrower claim, or leave it intact? Give your reason.", hint: "You may concede an objection. Identify exactly what survives, what changes, and why."};
    if (/^cc[12]_link$/.test(step.id)) return {...step, section: step.section.replace("Counter-Counter Response", "Evaluation"), label: "Revisit the thesis", prompt: "How does this evaluation affect your thesis? Keep, qualify, or revise it, and explain the change.", hint: "A stronger final judgement may be narrower than your opening claim."};
    if (/^cc[12]_conclusion$/.test(step.id)) return {...step, section: step.section.replace("Counter-Counter Response", "Evaluation"), hint: "Report the outcome honestly, including any concession or unresolved difficulty."};
    if (step.id === "thesis") return {...step, label: "Working thesis", prompt: "State your current answer to the question. You can revise this after examining objections."};
    return step;
  }),
  {id: "final_synthesis", section: "Final judgement", col: "cc", label: "Overall conclusion", prompt: "Weigh both argument cycles. What is your final answer to the exact question, which reason is decisive, and what limitation remains?", hint: "Explain why one consideration outweighs another. Make any change from your working thesis explicit."}
];
