class WikiDraftsController < ApplicationController
  before_action :require_login

  # Save action for both auto-save and manual save.
  # If :slot is not provided, defaults to auto-save (slot 0).
  # The pathname parameter is required here to store contextual information.
  def save
    # Determine slot value; default to 0 (auto-save) if not provided.
    slot = params[:slot].present? ? params[:slot].to_i : 0

    # Validate slot: must be 0 or between 1 and max_stored_slot.
    max_stored_slots = Setting.plugin_redmine_wiki_drafts[:max_stored_slots].to_i
    if slot != 0 && (slot < 1 || slot > max_stored_slots)
      render json: { status: 'error', message: I18n.t('message.error_invalid_slot', scope: :wiki_drafts) } and return
    end

    # Ensure pathname is provided for saving
    if params[:pathname].blank?
      render json: { status: 'error', message: 'Pathname parameter is required for saving.' } and return
    end

    # Find or initialize the draft based on user and slot (uniqueness is per user)
    @wiki_draft = WikiDraft.find_or_initialize_by(user_id: User.current.id, slot: slot)
    @wiki_draft.content   = params[:content]
    @wiki_draft.pathname  = params[:pathname]  # Store contextual information
    @wiki_draft.updated_at = Time.now

    if @wiki_draft.save
      render json: { status: 'ok' }
    else
      render json: { status: 'error', errors: @wiki_draft.errors.full_messages }
    end
  end

  # Index action to list all drafts for the current user
  def index
    drafts = WikiDraft.where(user_id: User.current.id)
    result = {}
    max_stored_slots = Setting.plugin_redmine_wiki_drafts[:max_stored_slots].to_i
    (0..max_stored_slots).each do |slot|
      draft = drafts.detect { |d| d.slot == slot }
      result[slot] = draft ? { id: draft.id, updated_at: draft.updated_at, content: draft.content, pathname: draft.pathname } : nil
    end
    render json: { status: 'ok', drafts: result }
  end

  # Show action to retrieve the content of a specific draft slot.
  def show
    slot = params[:slot].to_i
    draft = WikiDraft.find_by(user_id: User.current.id, slot: slot)
    if draft
      render json: { status: 'ok', content: draft.content, pathname: draft.pathname }
    else
      render json: { status: 'error', message: I18n.t('message.draft_not_found', scope: :wiki_drafts) }
    end
  end

  # Destroy action to delete a draft in the specified slot.
  def destroy
    slot = params[:slot].to_i
    draft = WikiDraft.find_by(user_id: User.current.id, slot: slot)
    if draft
      draft.destroy
      render json: { status: 'ok' }
    else
      render json: { status: 'error', message: I18n.t('message.error_delete', scope: :wiki_drafts) }
    end
  end
end
