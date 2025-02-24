class CreateWikiDrafts < ActiveRecord::Migration[4.2]
  def change
    create_table :wiki_drafts do |t|
      t.integer  :user_id,      null: false
      t.string  :pathname, null: false
      t.integer  :slot,         null: false, default: 0  # 0: auto save, 1-: manual save
      t.text     :content,      null: false
      t.datetime :updated_at,   null: false
    end

    add_index :wiki_drafts, [:user_id, :slot], unique: true
  end
end
