class WikiDraft < ActiveRecord::Base
  # Association with user
  belongs_to :user

  validates :slot, presence: true, numericality: { only_integer: true }
  validates :pathname, presence: true

  # Custom validation for allowed slot range (0 for auto-save, 1~max_stored_slots for manual)
  validate :slot_range

  private

  def slot_range
    max_stored_slots = Setting.plugin_redmine_wiki_drafts[:max_stored_slots].to_i
    unless slot == 0 || (slot >= 1 && slot <= max_stored_slots)
      errors.add(:slot, 'must be 0 for auto-save or between 1 and ' + max_stored_slots + ' for manual drafts.')
    end
  end
end
