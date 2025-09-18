import React from 'react';
import { Button, Input, Select } from './index';
import './FilterModal.css';

const FilterModal = ({
  isOpen,
  onClose,
  searchQuery,
  setSearchQuery,
  selectedTester,
  setSelectedTester,
  selectedStatus,
  setSelectedStatus,
  selectedPims,
  setSelectedPims,
  selectedStage,
  setSelectedStage,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  filterOptions,
  onSearch,
  onClearFilters,
  loading = false,
}) => {
  if (!isOpen) {
    return null;
  }

  const handleApply = () => {
    onSearch();
    onClose();
  };

  const handleClear = () => {
    onClearFilters();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="filter-modal-backdrop" onClick={handleBackdropClick}>
      <div className="filter-modal-content" onClick={e => e.stopPropagation()}>
        <div className="filter-modal-header">
          <div className="filter-modal-title">
            <svg className="filter-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
            </svg>
            Filter
          </div>
          <button onClick={onClose} className="filter-modal-close" aria-label="Close modal">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m18 6-12 12" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <div className="filter-modal-body">
          <div className="filter-form">
            <Input
              label="Search"
              placeholder="Enter keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <Select
              label="Tester"
              options={filterOptions.testers || []}
              value={selectedTester}
              onChange={(e) => setSelectedTester(e.target.value)}
              placeholder="Select a tester"
            />

            <Select
              label="Status"
              options={filterOptions.statuses || []}
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              placeholder="Select a status"
            />

            <Select
              label="Stage"
              options={filterOptions.stages || []}
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              placeholder="Select a stage"
            />

            <Input
              label="PIMS"
              placeholder=""
              value={selectedPims}
              onChange={(e) => setSelectedPims(e.target.value)}
            />

            <div className="date-range-section">
              <label className="date-label">Date</label>
              <div className="date-inputs">
                <input
                  type="date"
                  placeholder="mm/dd/yyyy"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="date-input"
                />
                <input
                  type="date"
                  placeholder="mm/dd/yyyy"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="date-input"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="filter-modal-footer">
          <Button variant="secondary" onClick={handleClear}>
            Clear
          </Button>
          <Button onClick={handleApply} disabled={loading}>
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FilterModal;