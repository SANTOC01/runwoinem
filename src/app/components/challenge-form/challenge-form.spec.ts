import { TestBed } from '@angular/core/testing';
import { ChallengeForm, FormSubmission } from './challenge-form';
import { ChallengeConfig } from '../../interfaces/challenge.interface';
import { ToastService } from '../../services/toast-service';

const config: ChallengeConfig = {
  id: 'test',
  title: 'Test',
  active: true,
  metricLabel: 'Kilometer',
  metricUnit: 'km',
  goalValue: 1000,
  maxEntryValue: 200,
  collections: { askAbove: 29, legacyAbove: 53 },
  milestones: [],
  goals: [],
  chartProfile: [],
  chartMaxScale: 0,
};

describe('ChallengeForm: "several runs?" question', () => {
  let form: ChallengeForm;
  let toast: jasmine.SpyObj<ToastService>;
  let sent: FormSubmission[];

  beforeEach(() => {
    toast = jasmine.createSpyObj('ToastService', ['show']);
    TestBed.configureTestingModule({ providers: [{ provide: ToastService, useValue: toast }] });
    const fixture = TestBed.createComponent(ChallengeForm);
    fixture.componentRef.setInput('config', config);
    form = fixture.componentInstance;
    sent = [];
    form.submitted.subscribe((s) => sent.push(s));
    form.name = 'Anna';
  });

  it('submits up to 29 km without asking', () => {
    form.value = 29;
    form.onSubmit();
    expect(form.asking()).toBeNull();
    expect(sent).toEqual([{ name: 'Anna', value: 29 }]);
  });

  it('asks above 29 km and sends the answer', () => {
    form.value = 35;
    form.onSubmit();
    expect(form.asking()).toBe(35);
    expect(sent).toEqual([]);

    form.answer(true);
    expect(form.asking()).toBeNull();
    expect(sent).toEqual([{ name: 'Anna', value: 35, collection: true }]);
    expect(toast.show).not.toHaveBeenCalled();
  });

  it('answers "Ein Lauf" with a dry "Respekt.."', () => {
    form.value = 60;
    form.onSubmit();
    form.answer(false);
    expect(sent).toEqual([{ name: 'Anna', value: 60, collection: false }]);
    expect(toast.show).toHaveBeenCalledWith('Respekt.. 🤨', 2500);
  });

  it('sends nothing when the question is cancelled', () => {
    form.value = 40;
    form.onSubmit();
    form.cancelQuestion();
    expect(sent).toEqual([]);
  });
});
