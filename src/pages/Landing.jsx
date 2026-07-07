import React from 'react';
import { Link } from 'react-router-dom';

const FEATURES = [
  { title: 'Smart Schedule', desc: 'Upload your timetable and build a beautiful weekly grid of all your classes, labs and tutorials.' },
  { title: 'Slides & Materials', desc: 'Keep every lecture slide, PDF and handout organized per subject. Never dig through downloads again.' },
  { title: 'Assignments', desc: 'Track deadlines with priorities and statuses. See what is due, overdue and done at a glance.' },
  { title: 'Exam Tracker', desc: 'Countdown to every quiz, midterm and final with location and syllabus notes.' },
  { title: 'GPA Calculator', desc: 'Enter grades per subject and watch your GPA update live, weighted by credits.' },
  { title: 'Focus Timer', desc: 'Built-in Pomodoro timer to grind through study sessions without burning out.' },
];

export default function Landing() {
  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="logo"><span className="logo-mark">S</span> StudyOKA</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/login" className="btn">Log in</Link>
          <Link to="/register" className="btn primary">Get started free</Link>
        </div>
      </nav>
      <section className="hero">
        <h1>Your academic life,<br /><span className="grad">finally organized.</span></h1>
        <p>
          StudyOKA brings your timetable, lecture slides, assignments, exams, notes and GPA
          into one fast, simple workspace — built for students who have better things to do than stay disorganized.
        </p>
        <div className="hero-cta">
          <Link to="/register" className="btn primary">Start organizing →</Link>
          <Link to="/login" className="btn">Try the demo</Link>
        </div>
      </section>
      <section className="features">
        {FEATURES.map((f) => (
          <div className="card feature-card" key={f.title}>
            <h4>{f.title}</h4>
            <p>{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
